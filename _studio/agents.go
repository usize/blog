package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// Agent is a command-line reviewer. Anything that can take a prompt and print
// a reply can be dropped in: the post is embedded in the prompt, the agent
// runs in an empty scratch directory, and Studio never lets it write to the
// repo. Suggestions are applied by the user from the UI.
type Agent struct {
	Name    string   `json:"name"`
	Command []string `json:"command"`
	// Stdin sends the prompt on stdin; otherwise "{prompt}" in Command is
	// replaced with it.
	Stdin bool `json:"stdin,omitempty"`
}

var builtinAgents = []Agent{
	{Name: "claude", Command: []string{"claude", "-p", "--tools", "", "--no-session-persistence"}, Stdin: true},
	{Name: "opencode", Command: []string{"opencode", "run", "--agent", "plan", "{prompt}"}},
}

// Agents returns the built-ins plus those in <root>/.studio/agents.json
// (same shape as Agent, as a JSON array; same name overrides a built-in).
func (r *Repo) Agents() ([]Agent, error) {
	agents := append([]Agent{}, builtinAgents...)
	b, err := os.ReadFile(filepath.Join(r.Root, ".studio", "agents.json"))
	if errors.Is(err, os.ErrNotExist) {
		return agents, nil
	}
	if err != nil {
		return agents, err
	}
	var extra []Agent
	if err := json.Unmarshal(b, &extra); err != nil {
		return agents, fmt.Errorf(".studio/agents.json: %w", err)
	}
	for _, a := range extra {
		if a.Name == "" || len(a.Command) == 0 {
			return agents, errors.New(".studio/agents.json: each agent needs a name and command")
		}
		replaced := false
		for i := range agents {
			if agents[i].Name == a.Name {
				agents[i], replaced = a, true
			}
		}
		if !replaced {
			agents = append(agents, a)
		}
	}
	return agents, nil
}

type Comment struct {
	Quote      string `json:"quote"`
	Comment    string `json:"comment"`
	Suggestion string `json:"suggestion,omitempty"`
}

type Review struct {
	Summary  string    `json:"summary"`
	Comments []Comment `json:"comments"`
	Raw      string    `json:"raw,omitempty"` // set when the reply wasn't parseable
}

const reviewPrompt = `You are an editor reviewing a blog post draft. Read it and give honest, specific feedback: clarity, structure, argument, tone, typos, and anything unsupported or unclear. Do not rewrite the whole post.

Do not use tools or touch any files. Reply with ONLY a JSON object, no markdown fences, in this shape:
{"summary": "2-3 sentence overall take",
 "comments": [{"quote": "exact text copied from the post", "comment": "what's wrong or could be better", "suggestion": "optional replacement for the quoted text"}]}
"quote" must be copied verbatim so it can be found in the post. Prefer 5-12 comments, most important first.

Suggestions must be targeted diffs. The user will review each as a before/after diff, so change only the words that need changing: quote just that span (plus at most a few neighbouring words if needed to make it unique) and make "suggestion" that same span with the minimal edit. Fix typos, grammar, wrong words and unclear phrasing locally. Never rewrite a whole sentence or paragraph for style, and never merge several fixes into one suggestion. If a problem can't be fixed with a small local edit (structure, argument, missing content), give a comment with no "suggestion".

THE POST (markdown, with front matter):
-----
%s
-----
`

func (a Agent) Run(ctx context.Context, content string) (*Review, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Minute)
	defer cancel()
	prompt := fmt.Sprintf(reviewPrompt, content)

	args := append([]string{}, a.Command[1:]...)
	if !a.Stdin {
		for i := range args {
			args[i] = strings.ReplaceAll(args[i], "{prompt}", prompt)
		}
	}
	bin, err := exec.LookPath(a.Command[0])
	if err != nil {
		return nil, fmt.Errorf("%s is not installed", a.Command[0])
	}
	scratch, err := os.MkdirTemp("", "studio-agent-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(scratch)

	cmd := exec.CommandContext(ctx, bin, args...)
	cmd.Dir = scratch
	if a.Stdin {
		cmd.Stdin = strings.NewReader(prompt)
	}
	var out, stderr bytes.Buffer
	cmd.Stdout, cmd.Stderr = &out, &stderr
	if err := cmd.Run(); err != nil {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, fmt.Errorf("%s failed: %v\n%s", a.Name, err, strings.TrimSpace(stderr.String()))
	}
	return parseReview(out.String(), content), nil
}

// parseReview pulls the JSON object out of whatever the agent printed
// (fences, preamble and all) and drops comments whose quote isn't in the post.
// If nothing parses, the raw reply is returned so the feedback isn't lost.
func parseReview(reply, content string) *Review {
	reply = strings.TrimSpace(reply)
	for start := strings.Index(reply, "{"); start >= 0; {
		var rv Review
		dec := json.NewDecoder(strings.NewReader(reply[start:]))
		if err := dec.Decode(&rv); err == nil && (rv.Summary != "" || len(rv.Comments) > 0) {
			kept := rv.Comments[:0]
			for _, c := range rv.Comments {
				if strings.TrimSpace(c.Comment) != "" {
					if !strings.Contains(content, c.Quote) {
						c.Suggestion = "" // can't be applied safely
						c.Quote = ""
					}
					if c.Suggestion != "" {
						c.Quote, c.Suggestion = targetDiff(content, c.Quote, c.Suggestion)
					}
					kept = append(kept, c)
				}
			}
			rv.Comments = kept
			return &rv
		}
		next := strings.Index(reply[start+1:], "{")
		if next < 0 {
			break
		}
		start += 1 + next
	}
	return &Review{Raw: reply}
}

var wordTok = regexp.MustCompile(`\s+|\S+`)

const maxDiffSpan = 300 // runes; longer than this isn't a targeted edit

// targetDiff shrinks quote->suggestion to the words that actually change,
// then adds neighbouring words back only until the quote is unique in content
// (so it applies in exactly one place). It returns an empty suggestion when
// the edit is a no-op, can't be made unique, or is too large to be targeted.
func targetDiff(content, quote, suggestion string) (string, string) {
	q, s := wordTok.FindAllString(quote, -1), wordTok.FindAllString(suggestion, -1)
	pre := 0
	for pre < len(q) && pre < len(s) && q[pre] == s[pre] {
		pre++
	}
	if pre == len(q) && pre == len(s) {
		return quote, ""
	}
	suf := 0
	for suf < len(q)-pre && suf < len(s)-pre && q[len(q)-1-suf] == s[len(s)-1-suf] {
		suf++
	}
	// Add unchanged neighbouring words back, nearest first, until unique.
	for k := 0; k <= max(pre, suf); k++ {
		b, a := min(k, pre), min(k, suf)
		qq := strings.Join(q[pre-b:len(q)-suf+a], "")
		ss := strings.Join(s[pre-b:len(s)-suf+a], "")
		if qq != "" && strings.Count(content, qq) == 1 {
			if len([]rune(qq)) > maxDiffSpan || len([]rune(ss)) > maxDiffSpan {
				break
			}
			return qq, ss
		}
	}
	return quote, ""
}
