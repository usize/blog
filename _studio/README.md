# Blog Studio

A local authoring app for this blog. One static Go binary with the UI embedded.

    make studio            # builds ./studio for this machine
    make studio-release    # darwin/linux x amd64/arm64 into ./dist
    ./studio               # run from anywhere inside the blog; opens http://127.0.0.1:4747

Flags: `-dir <path>`, `-addr host:port`, `-no-open`.

- **New post** creates `YYYY/month/slug.md` (or `YYYY/drafts/`) with front matter, heading and byline.
- Edit with a live preview rendered in the site's own `assets/style.css`. Autosaves; Cmd/Ctrl-S, -B, -I, -K work.
- Paste or drag images into the editor: they're saved beside the post and linked relatively.
- **Publish** moves drafts into the month folder (with referenced images), adds or updates the entry in `README.md`
  under `## Month YYYY`, then commits (`git commit` of just those paths) and optionally pushes.

It only listens on loopback and rejects requests with a foreign Host header or without `X-Studio: 1`.
