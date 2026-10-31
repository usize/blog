package main

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

// Repo is a checkout of the blog: YYYY/month/slug.md posts plus a README.md index.
type Repo struct {
	Root string
}

type Post struct {
	Path     string    `json:"path"`
	Title    string    `json:"title"`
	Draft    bool      `json:"draft"`
	Listed   bool      `json:"listed"`
	Modified time.Time `json:"modified"`
}

var (
	yearDir   = regexp.MustCompile(`^\d{4}$`)
	titleLine = regexp.MustCompile(`(?m)^title:\s*(.+?)\s*$`)
	nonSlug   = regexp.MustCompile(`[^a-z0-9]+`)
	months    = []string{"january", "february", "march", "april", "may", "june", "july",
		"august", "september", "october", "november", "december"}
)

func findRoot(start string) (string, error) {
	dir, err := filepath.Abs(start)
	if err != nil {
		return "", err
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "_config.yml")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", errors.New("no _config.yml found; run from inside the blog or pass -dir")
		}
		dir = parent
	}
}

// Resolve turns a client-supplied relative path into an absolute one, refusing
// anything that escapes the repo or touches dotfiles.
func (r *Repo) Resolve(rel string) (string, error) {
	rel = filepath.ToSlash(filepath.Clean(rel))
	if rel == "." || strings.HasPrefix(rel, "../") || strings.HasPrefix(rel, "/") {
		return "", errors.New("bad path")
	}
	for _, part := range strings.Split(rel, "/") {
		if strings.HasPrefix(part, ".") {
			return "", errors.New("bad path")
		}
	}
	return filepath.Join(r.Root, filepath.FromSlash(rel)), nil
}

func (r *Repo) ResolvePost(rel string) (string, error) {
	if !strings.HasSuffix(rel, ".md") || !yearDir.MatchString(strings.SplitN(rel, "/", 2)[0]) {
		return "", errors.New("not a post path")
	}
	return r.Resolve(rel)
}

func (r *Repo) readme() string {
	b, _ := os.ReadFile(filepath.Join(r.Root, "README.md"))
	return string(b)
}

func (r *Repo) Posts() ([]Post, error) {
	readme := r.readme()
	var posts []Post
	entries, err := os.ReadDir(r.Root)
	if err != nil {
		return nil, err
	}
	for _, e := range entries {
		if !e.IsDir() || !yearDir.MatchString(e.Name()) {
			continue
		}
		filepath.WalkDir(filepath.Join(r.Root, e.Name()), func(p string, d fs.DirEntry, err error) error {
			if err != nil || d.IsDir() || !strings.HasSuffix(p, ".md") {
				return nil
			}
			b, err := os.ReadFile(p)
			if err != nil || !strings.HasPrefix(string(b), "---") {
				return nil
			}
			head := string(b)
			if len(head) > 600 {
				head = head[:600]
			}
			m := titleLine.FindStringSubmatch(head)
			if m == nil {
				return nil
			}
			rel, _ := filepath.Rel(r.Root, p)
			rel = filepath.ToSlash(rel)
			info, _ := d.Info()
			posts = append(posts, Post{
				Path:     rel,
				Title:    strings.Trim(m[1], `"'`),
				Draft:    strings.Contains(rel, "/drafts/"),
				Listed:   strings.Contains(readme, "]("+rel+")"),
				Modified: info.ModTime(),
			})
			return nil
		})
	}
	sort.Slice(posts, func(i, j int) bool { return posts[i].Modified.After(posts[j].Modified) })
	return posts, nil
}

func slugify(s string) string {
	return strings.Trim(nonSlug.ReplaceAllString(strings.ToLower(s), "-"), "-")
}

func (r *Repo) git(args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = r.Root
	out, err := cmd.CombinedOutput()
	return strings.TrimSpace(string(out)), err
}

// Author is the GitHub owner of origin (falling back to git user.name).
func (r *Repo) Author() string {
	if url, err := r.git("remote", "get-url", "origin"); err == nil {
		if m := regexp.MustCompile(`github\.com[:/]([^/]+)/`).FindStringSubmatch(url); m != nil {
			return m[1]
		}
	}
	name, _ := r.git("config", "user.name")
	return name
}

func (r *Repo) NewPost(title, slug string, draft bool, now time.Time) (string, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		return "", errors.New("title required")
	}
	if slug = slugify(slug); slug == "" {
		slug = slugify(title)
	}
	sub := months[now.Month()-1]
	if draft {
		sub = "drafts"
	}
	rel := fmt.Sprintf("%d/%s/%s.md", now.Year(), sub, slug)
	abs, err := r.ResolvePost(rel)
	if err != nil {
		return "", err
	}
	if _, err := os.Stat(abs); err == nil {
		return "", errors.New(rel + " already exists")
	}
	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
		return "", err
	}
	author := r.Author()
	body := fmt.Sprintf("---\nlayout: default\ntitle: %q\n---\n\n# %s\n\n#### [%s](https://github.com/%s) %s %d\n\n",
		title, title, author, author, now.Month(), now.Year())
	return rel, os.WriteFile(abs, []byte(body), 0o644)
}

var localRef = regexp.MustCompile(`(?:\]\(|src=")([^/):"\s]+\.[A-Za-z0-9]+)`)

// Move relocates a post (and the sibling files it references) into dir.
func (r *Repo) Move(rel, newDir string) (newRel string, touched []string, err error) {
	abs, err := r.ResolvePost(rel)
	if err != nil {
		return "", nil, err
	}
	dest, err := r.Resolve(newDir)
	if err != nil {
		return "", nil, err
	}
	if err := os.MkdirAll(dest, 0o755); err != nil {
		return "", nil, err
	}
	src, _ := os.ReadFile(abs)
	names := []string{filepath.Base(abs)}
	for _, m := range localRef.FindAllStringSubmatch(string(src), -1) {
		if st, err := os.Stat(filepath.Join(filepath.Dir(abs), m[1])); err == nil && !st.IsDir() {
			names = append(names, m[1])
		}
	}
	for _, n := range names {
		to := filepath.Join(dest, n)
		if _, err := os.Stat(to); err == nil {
			return "", nil, errors.New(newDir + "/" + n + " already exists")
		}
	}
	for _, n := range names {
		if err := os.Rename(filepath.Join(filepath.Dir(abs), n), filepath.Join(dest, n)); err != nil {
			return "", nil, err
		}
		touched = append(touched, filepath.ToSlash(filepath.Join(filepath.Dir(rel), n)), newDir+"/"+n)
	}
	return newDir + "/" + filepath.Base(abs), touched, nil
}

// isEntryStart reports whether lines[k] opens a new entry: a link-led
// paragraph (optionally struck through) after a blank line.
func isEntryStart(lines []string, k int) bool {
	return k > 0 && strings.TrimSpace(lines[k-1]) == "" &&
		(strings.HasPrefix(lines[k], "[") || strings.HasPrefix(lines[k], "~~[")) && strings.Contains(lines[k], "](")
}

// UpsertEntry writes the README entry for a post into its "## Month YYYY"
// section, removing any earlier entry that linked to oldPaths.
func UpsertEntry(readme, title, link, summary string, oldPaths []string, month time.Time) string {
	lines := strings.Split(readme, "\n")
	isBreak := func(l string) bool {
		t := strings.TrimSpace(l)
		return t == "----" || strings.HasPrefix(t, "## ")
	}

	// Remove the existing entry, keeping its summary if none was supplied.
	for i, l := range lines {
		if !strings.HasPrefix(l, "[") && !strings.HasPrefix(l, "~~[") {
			continue
		}
		hit := false
		for _, p := range oldPaths {
			if strings.Contains(l, "]("+p+")") {
				hit = true
			}
		}
		if !hit {
			continue
		}
		j := i + 1
		for j < len(lines) && !isBreak(lines[j]) && !isEntryStart(lines, j) {
			j++
		}
		if strings.TrimSpace(summary) == "" {
			summary = strings.TrimSpace(strings.Join(lines[i+1:j], "\n"))
		}
		if j < len(lines) && strings.TrimSpace(lines[j]) == "----" {
			j++
		}
		lines = append(lines[:i:i], lines[j:]...)
		break
	}

	// Drop sections left empty by the removal.
	for i := 0; i < len(lines); i++ {
		if !strings.HasPrefix(lines[i], "## ") {
			continue
		}
		j := i + 1
		for j < len(lines) && strings.TrimSpace(lines[j]) == "" {
			j++
		}
		if j >= len(lines) || strings.HasPrefix(lines[j], "## ") {
			lines = append(lines[:i:i], lines[j:]...)
			i--
		}
	}

	entry := "[" + title + "](" + link + ")\n"
	if s := strings.TrimSpace(summary); s != "" {
		entry += "\n" + s + "\n"
	}
	heading := fmt.Sprintf("## %s %d", month.Month(), month.Year())

	at, found := -1, false
	for i, l := range lines {
		if strings.TrimSpace(l) == heading {
			at, found = i, true
			break
		}
	}
	if !found {
		// New sections go above the first older (or non-dated) section.
		at = len(lines)
		for i, l := range lines {
			if !strings.HasPrefix(l, "## ") {
				continue
			}
			t, err := time.Parse("January 2006", strings.TrimPrefix(l, "## "))
			if err != nil || t.Before(time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, time.UTC)) {
				at = i
				break
			}
		}
	}

	var block string
	if found {
		next := at + 1
		for next < len(lines) && strings.TrimSpace(lines[next]) == "" {
			next++
		}
		block = "\n" + entry
		if next < len(lines) && !strings.HasPrefix(lines[next], "## ") {
			block += "\n----\n"
		}
		lines = append(lines[:at+1:at+1], lines[next:]...)
		at++
	} else {
		block = heading + "\n\n" + entry
		if at < len(lines) {
			block += "\n----\n"
		}
	}
	out := append(append(append([]string{}, lines[:at]...), strings.Split(block, "\n")...), lines[at:]...)
	if strings.TrimSpace(readme) == "" {
		return strings.TrimLeft(strings.Join(out, "\n"), "\n")
	}
	return strings.Join(out, "\n")
}
