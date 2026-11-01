# Blog Studio

A local authoring app for this blog. One static Go binary with the UI embedded.

    make studio            # builds ./studio for this machine
    make studio-release    # darwin/linux x amd64/arm64 into ./dist
    ./studio               # run from anywhere inside the blog; opens http://127.0.0.1:4747

Flags: `-dir <path>`, `-addr host:port`, `-no-open`.

- **New post** creates `YYYY/month/slug.md` (or `YYYY/drafts/`) with front matter, heading and byline.
- Edit with a live preview rendered in the site's own `assets/style.css`. Autosaves; Cmd/Ctrl-S, -B, -I, -K work.
- Toolbar for common formatting. Paste, drag or pick images and videos: they are saved beside the post and linked relatively (videos as `<video>`).
- **Review** sends the post to a CLI agent and lists its comments in a side panel (click a quote to jump to it).
  Suggestions are targeted diffs, shown as word-level before/after: tick the ones you want and **Apply selected**, or
  **Apply** one at a time. Studio enforces this on whatever the agent returns: unchanged words are trimmed off, context
  is added back only until the quote matches exactly one place in the post, and no-op, ambiguous or oversized (>300
  chars) edits keep their comment but lose the suggestion. The agent only sees the text in its prompt, runs in an
  empty temp directory with no tools (claude) or the read-only `plan` agent (opencode), and never writes to the repo.
  Built in: `claude`, `opencode`. Add more in `.studio/agents.json` (same name overrides a built-in):

      [{"name": "local", "command": ["opencode", "run", "-m", "ollama/qwen3", "--agent", "plan", "{prompt}"]},
       {"name": "other", "command": ["my-agent", "--print"], "stdin": true}]

  The bar also has a model box (type anything; suggestions come from the agent) and a thinking-effort picker. Both
  are remembered per agent in the browser and become the defaults; blank means the agent's own default. Agents opt in
  with `modelArgs` (e.g. `["--model","{model}"]`), `models` or `modelsCommand` (prints one model per line), `effortArgs`
  (e.g. `["--effort","{effort}"]`) and `efforts`. The flags are placed before `{prompt}`, or last when it's on stdin.
  `{prompt}` in `command` is replaced with the prompt; with `"stdin": true` it's piped in instead. The agent is asked
  to reply with a JSON object (`summary`, `comments[{quote, comment, suggestion}]`); if a model can't manage that,
  its raw reply is shown instead.
- **Publish** moves drafts into the month folder (with referenced images), adds or updates the entry in `README.md`
  under `## Month YYYY`, then commits (`git commit` of just those paths) and optionally pushes.

It only listens on loopback and rejects requests with a foreign Host header or without `X-Studio: 1`.
