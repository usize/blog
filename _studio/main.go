package main

import (
	"bytes"
	"embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
)

//go:embed web
var webFS embed.FS

var md = goldmark.New(
	goldmark.WithExtensions(extension.GFM, extension.Footnote),
	goldmark.WithParserOptions(parser.WithAutoHeadingID()),
	goldmark.WithRendererOptions(html.WithUnsafe()),
)

func main() {
	addr := flag.String("addr", "127.0.0.1:4747", "listen address")
	dir := flag.String("dir", ".", "blog directory (or any directory inside it)")
	noOpen := flag.Bool("no-open", false, "don't open a browser")
	flag.Parse()

	root, err := findRoot(*dir)
	if err != nil {
		log.Fatal(err)
	}
	s := &Server{repo: &Repo{Root: root}}

	ln, err := net.Listen("tcp", *addr)
	if err != nil {
		log.Fatal(err)
	}
	url := "http://" + ln.Addr().String()
	fmt.Printf("blog studio for %s\n%s\n", root, url)
	if !*noOpen {
		openBrowser(url)
	}
	log.Fatal(http.Serve(ln, s.routes()))
}

func openBrowser(url string) {
	cmd := "xdg-open"
	if runtime.GOOS == "darwin" {
		cmd = "open"
	}
	exec.Command(cmd, url).Start()
}

type Server struct{ repo *Repo }

func (s *Server) routes() http.Handler {
	mux := http.NewServeMux()
	web, _ := fs.Sub(webFS, "web")
	mux.Handle("/", http.FileServerFS(web))
	mux.HandleFunc("GET /api/info", s.info)
	mux.HandleFunc("GET /api/posts", s.posts)
	mux.HandleFunc("GET /api/post", s.getPost)
	mux.HandleFunc("PUT /api/post", s.putPost)
	mux.HandleFunc("POST /api/new", s.newPost)
	mux.HandleFunc("POST /api/upload", s.upload)
	mux.HandleFunc("POST /api/preview", s.preview)
	mux.HandleFunc("POST /api/publish", s.publish)
	mux.HandleFunc("GET /api/agents", s.agents)
	mux.HandleFunc("POST /api/review", s.review)
	mux.HandleFunc("GET /api/status", s.status)
	mux.HandleFunc("GET /files/", s.files)
	return s.guard(mux)
}

// guard keeps other websites from driving the local app: the Host must be
// loopback (DNS rebinding) and writes must carry a header browsers only allow
// same-origin (CSRF).
func (s *Server) guard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host, _, err := net.SplitHostPort(r.Host)
		if err != nil {
			host = r.Host
		}
		if host != "127.0.0.1" && host != "localhost" && host != "[::1]" && host != "::1" {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		if r.Method != "GET" && r.Header.Get("X-Studio") != "1" {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func fail(w http.ResponseWriter, code int, err error) {
	http.Error(w, err.Error(), code)
}

func decode(r *http.Request, v any) error {
	return json.NewDecoder(http.MaxBytesReader(nil, r.Body, 32<<20)).Decode(v)
}

func (s *Server) info(w http.ResponseWriter, r *http.Request) {
	branch, _ := s.repo.git("rev-parse", "--abbrev-ref", "HEAD")
	now := time.Now()
	writeJSON(w, map[string]any{
		"root": s.repo.Root, "branch": branch, "author": s.repo.Author(),
		"year": now.Year(), "month": int(now.Month()),
	})
}

func (s *Server) posts(w http.ResponseWriter, r *http.Request) {
	posts, err := s.repo.Posts()
	if err != nil {
		fail(w, 500, err)
		return
	}
	writeJSON(w, posts)
}

func (s *Server) getPost(w http.ResponseWriter, r *http.Request) {
	abs, err := s.repo.ResolvePost(r.URL.Query().Get("path"))
	if err != nil {
		fail(w, 400, err)
		return
	}
	b, err := os.ReadFile(abs)
	if err != nil {
		fail(w, 404, err)
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Write(b)
}

func (s *Server) putPost(w http.ResponseWriter, r *http.Request) {
	var req struct{ Path, Content string }
	if err := decode(r, &req); err != nil {
		fail(w, 400, err)
		return
	}
	abs, err := s.repo.ResolvePost(req.Path)
	if err != nil {
		fail(w, 400, err)
		return
	}
	if _, err := os.Stat(abs); err != nil {
		fail(w, 404, err)
		return
	}
	// Write-then-rename so a crash never leaves a half-written post.
	tmp := abs + ".tmp"
	if err := os.WriteFile(tmp, []byte(req.Content), 0o644); err != nil {
		fail(w, 500, err)
		return
	}
	if err := os.Rename(tmp, abs); err != nil {
		fail(w, 500, err)
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

func (s *Server) newPost(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Title, Slug string
		Draft       bool
	}
	if err := decode(r, &req); err != nil {
		fail(w, 400, err)
		return
	}
	rel, err := s.repo.NewPost(req.Title, req.Slug, req.Draft, time.Now())
	if err != nil {
		fail(w, 400, err)
		return
	}
	writeJSON(w, map[string]string{"path": rel})
}

var unsafeName = regexp.MustCompile(`[^A-Za-z0-9._-]+`)

// upload stores a pasted/dropped image or video next to the post and returns its name.
func (s *Server) upload(w http.ResponseWriter, r *http.Request) {
	abs, err := s.repo.ResolvePost(r.URL.Query().Get("path"))
	if err != nil {
		fail(w, 400, err)
		return
	}
	name := unsafeName.ReplaceAllString(filepath.Base(r.URL.Query().Get("name")), "-")
	ext := strings.ToLower(filepath.Ext(name))
	if !map[string]bool{".png": true, ".jpg": true, ".jpeg": true, ".gif": true, ".webp": true, ".avif": true, ".svg": true,
		".mp4": true, ".m4v": true, ".webm": true, ".mov": true}[ext] {
		fail(w, 400, errors.New("unsupported file type"))
		return
	}
	dir := filepath.Dir(abs)
	base := strings.TrimSuffix(name, ext)
	for i := 2; ; i++ {
		if _, err := os.Stat(filepath.Join(dir, name)); err != nil {
			break
		}
		name = fmt.Sprintf("%s-%d%s", base, i, ext)
	}
	data, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 512<<20))
	if err != nil {
		fail(w, 400, err)
		return
	}
	if err := os.WriteFile(filepath.Join(dir, name), data, 0o644); err != nil {
		fail(w, 500, err)
		return
	}
	writeJSON(w, map[string]string{"name": name})
}

func stripFrontMatter(src string) string {
	if strings.HasPrefix(src, "---\n") {
		if i := strings.Index(src[4:], "\n---"); i >= 0 {
			rest := src[4+i+4:]
			return strings.TrimPrefix(rest, "\n")
		}
	}
	return src
}

// preview renders a post inside the site's own stylesheet so what you see is
// close to what Pages will serve.
func (s *Server) preview(w http.ResponseWriter, r *http.Request) {
	var req struct{ Path, Content string }
	if err := decode(r, &req); err != nil {
		fail(w, 400, err)
		return
	}
	var body bytes.Buffer
	if err := md.Convert([]byte(stripFrontMatter(req.Content)), &body); err != nil {
		fail(w, 500, err)
		return
	}
	base := "/files/" + path.Dir(req.Path) + "/"
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, `<!DOCTYPE html><html><head><meta charset="utf-8"><base href="%s">
<link rel="stylesheet" href="/files/assets/style.css"></head>
<body><main class="markdown-body">%s</main></body></html>`, html_escape(base), body.String())
}

func html_escape(s string) string {
	return strings.NewReplacer("&", "&amp;", `"`, "&quot;", "<", "&lt;", ">", "&gt;").Replace(s)
}

// files serves repo content (images, the site stylesheet) for the preview.
func (s *Server) files(w http.ResponseWriter, r *http.Request) {
	abs, err := s.repo.Resolve(strings.TrimPrefix(r.URL.Path, "/files/"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, abs)
}

func (s *Server) agents(w http.ResponseWriter, r *http.Request) {
	agents, err := s.repo.Agents()
	type item struct {
		Name      string `json:"name"`
		Available bool   `json:"available"`
	}
	items := []item{}
	for _, a := range agents {
		_, lookErr := exec.LookPath(a.Command[0])
		items = append(items, item{a.Name, lookErr == nil})
	}
	resp := map[string]any{"agents": items}
	if err != nil {
		resp["error"] = err.Error()
	}
	writeJSON(w, resp)
}

// review hands the current text to a reviewer agent and returns its comments.
// It runs until the agent finishes or the browser gives up on the request.
func (s *Server) review(w http.ResponseWriter, r *http.Request) {
	var req struct{ Agent, Path, Content string }
	if err := decode(r, &req); err != nil {
		fail(w, 400, err)
		return
	}
	if _, err := s.repo.ResolvePost(req.Path); err != nil {
		fail(w, 400, err)
		return
	}
	agents, _ := s.repo.Agents()
	for _, a := range agents {
		if a.Name == req.Agent {
			rv, err := a.Run(r.Context(), req.Content)
			if err != nil {
				fail(w, 502, err)
				return
			}
			writeJSON(w, rv)
			return
		}
	}
	fail(w, 400, errors.New("unknown agent"))
}

func (s *Server) status(w http.ResponseWriter, r *http.Request) {
	out, _ := s.repo.git("status", "--short")
	writeJSON(w, map[string]string{"status": out})
}

type publishReq struct {
	Path    string
	Year    int
	Month   int // 1-12
	Summary string
	Message string
	Push    bool
	DryRun  bool
}

func (s *Server) publish(w http.ResponseWriter, r *http.Request) {
	var req publishReq
	if err := decode(r, &req); err != nil {
		fail(w, 400, err)
		return
	}
	res, err := s.doPublish(req)
	if err != nil {
		fail(w, 400, err)
		return
	}
	writeJSON(w, res)
}

func (s *Server) doPublish(req publishReq) (map[string]any, error) {
	rp := s.repo
	if req.Month < 1 || req.Month > 12 || req.Year < 2000 {
		return nil, errors.New("pick a month")
	}
	abs, err := rp.ResolvePost(req.Path)
	if err != nil {
		return nil, err
	}
	if _, err := os.Stat(abs); err != nil {
		return nil, err
	}
	b, _ := os.ReadFile(abs)
	m := titleLine.FindStringSubmatch(string(b))
	if m == nil {
		return nil, errors.New("post has no title in its front matter")
	}
	title := strings.Trim(m[1], `"'`)
	when := time.Date(req.Year, time.Month(req.Month), 1, 0, 0, 0, 0, time.UTC)

	newRel := req.Path
	touched := []string{req.Path}
	if strings.Contains(req.Path, "/drafts/") {
		newRel = fmt.Sprintf("%d/%s/%s", req.Year, months[req.Month-1], path.Base(req.Path))
	}
	if req.DryRun {
		entry := UpsertEntry(rp.readme(), title, newRel, req.Summary, []string{req.Path, newRel}, when)
		return map[string]any{"path": newRel, "readme": entry, "title": title}, nil
	}

	oldPaths := []string{req.Path}
	if newRel != req.Path {
		var moved []string
		newRel, moved, err = rp.Move(req.Path, path.Dir(newRel))
		if err != nil {
			return nil, err
		}
		touched = moved
		oldPaths = append(oldPaths, newRel)
	}
	readmePath := filepath.Join(rp.Root, "README.md")
	updated := UpsertEntry(rp.readme(), title, newRel, req.Summary, oldPaths, when)
	if err := os.WriteFile(readmePath, []byte(updated), 0o644); err != nil {
		return nil, err
	}

	msg := strings.TrimSpace(req.Message)
	if msg == "" {
		msg = "Publish: " + title
	}
	// Stage new locations; record removals only for paths git already tracks
	// (an uncommitted draft that moved has nothing to remove).
	paths := []string{"README.md"}
	for _, p := range touched {
		if _, err := os.Stat(filepath.Join(rp.Root, p)); err == nil {
			paths = append(paths, p)
		} else if _, err := rp.git("ls-files", "--error-unmatch", p); err == nil {
			paths = append(paths, p)
		}
	}
	if out, err := rp.git(append([]string{"add", "-A", "--"}, paths...)...); err != nil {
		return nil, fmt.Errorf("git add: %s", out)
	}
	out, err := rp.git(append([]string{"commit", "-m", msg, "--"}, paths...)...)
	if err != nil {
		return nil, fmt.Errorf("git commit: %s", out)
	}
	log := out
	if req.Push {
		out, err := rp.git("push")
		log += "\n" + out
		if err != nil {
			return map[string]any{"path": newRel, "log": log, "pushed": false}, nil
		}
	}
	return map[string]any{"path": newRel, "log": log, "pushed": req.Push}, nil
}
