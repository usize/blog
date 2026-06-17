#!/usr/bin/env python3
"""
restore.py — Restore mrrrgn.com blog posts from Wayback Machine captures.

Strips the Wayback Machine toolbar/scripts, downloads original assets,
rewrites all links to relative paths, and outputs clean HTML.

Usage:
    mkdir -p raw
    # Save "View Page Source" from Wayback Machine as raw/21.html, raw/22.html, etc.
    pip install beautifulsoup4 requests
    python restore.py

Output:
    site/
    ├── assets/          # images, favicon, etc.
    ├── 21/index.html
    ├── 22/index.html
    └── ...
"""

import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup, Comment

# ── directories ──────────────────────────────────────────────────────────────

RAW_DIR = Path("raw")
SITE_DIR = Path("site")
ASSETS_DIR = SITE_DIR / "assets"

# ── patterns ─────────────────────────────────────────────────────────────────

# Wayback URL wrappers: /web/<timestamp>[suffix]/http...
WB_FULL = re.compile(
    r"https?://web\.archive\.org/web/\d{14}(?:im_|js_|cs_|if_|fw_)?/(https?://.+)"
)
WB_REL = re.compile(
    r"/web/\d{14}(?:im_|js_|cs_|if_|fw_)?/(https?://.+)"
)
WB_STATIC = re.compile(r"https?://web-static\.archive\.org/")

# mrrrgn.com URL shapes
MRRRGN_STATIC = re.compile(r"https?://mrrrgn\.com/static/(.+)")
MRRRGN_POST = re.compile(r"https?://mrrrgn\.com/(\d+)/\s*")
MRRRGN_ROOT = re.compile(r"https?://mrrrgn\.com/?$")
MRRRGN_PAGE = re.compile(r"https?://mrrrgn\.com/(sections|rss|license)/?\s*")

# Wayback infrastructure markers in inline scripts
WB_SCRIPT_MARKERS = ("__wm.", "archive_analytics", "RufflePlayer", "wombat")


# ── helpers ──────────────────────────────────────────────────────────────────


def unwrap(url: str) -> str:
    """Strip Wayback wrapper, return original URL."""
    if not url:
        return url
    url = url.strip()
    for pat in (WB_FULL, WB_REL):
        m = pat.match(url)
        if m:
            return m.group(1)
    return url


def is_wb_infra(url: str) -> bool:
    """True if the URL belongs to Wayback infrastructure (not original content)."""
    return bool(url and WB_STATIC.match(url))


def wayback_download_url(src: str) -> str:
    """Ensure a Wayback asset URL is absolute so we can fetch it."""
    src = src.strip()
    if src.startswith("/web/"):
        return "https://web.archive.org" + src
    return src


def download(wb_url: str, orig_url: str, dest: Path) -> bool:
    """Download an asset. Try Wayback first, then the original host."""
    if dest.exists():
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    for url in (wb_url, orig_url):
        try:
            print(f"    GET {url}")
            r = requests.get(
                url, timeout=20,
                headers={"User-Agent": "mrrrgn-restore/1.0"},
            )
            if r.status_code == 200 and len(r.content) > 0:
                dest.write_bytes(r.content)
                time.sleep(0.5)  # polite crawl delay
                return True
        except Exception as e:
            print(f"    FAIL: {e}")
    print(f"    !! could not download {orig_url}")
    return False


# ── core transform ───────────────────────────────────────────────────────────


def clean(html: str, post_id: str) -> tuple[str, list[tuple[str, str, str]]]:
    """
    Clean one archived page.

    Returns (cleaned_html, [(wayback_url, original_url, local_filename), ...])
    """
    soup = BeautifulSoup(html, "html.parser")
    assets = []  # (wb_url, orig_url, filename)

    # ── remove wayback toolbar ───────────────────────────────────────────
    for eid in ("wm-ipp-base", "wm-ipp-print"):
        tag = soup.find(id=eid)
        if tag:
            tag.decompose()

    # ── remove wayback/analytics scripts ─────────────────────────────────
    for script in list(soup.find_all("script")):
        src = script.get("src", "")
        text = script.string or ""
        if is_wb_infra(src):
            script.decompose()
        elif any(m in src for m in ("wombat", "bundle-playback", "athena", "ruffle")):
            script.decompose()
        elif any(m in text for m in WB_SCRIPT_MARKERS):
            script.decompose()
        elif "GoogleAnalyticsObject" in text or "ga('send','pageview')" in text.replace(" ", ""):
            script.decompose()

    # ── remove wayback stylesheets ───────────────────────────────────────
    for link in list(soup.find_all("link", rel="stylesheet")):
        if is_wb_infra(link.get("href", "")):
            link.decompose()

    # ── remove wayback HTML comments ─────────────────────────────────────
    for c in soup.find_all(string=lambda t: isinstance(t, Comment)):
        if any(k in c for k in ("WAYBACK", "FILE ARCHIVED", "playback timings",
                                 "End Wayback", "BEGIN WAYBACK")):
            c.extract()

    # ── images ───────────────────────────────────────────────────────────
    for img in list(soup.find_all("img")):
        src = img.get("src", "")
        orig = unwrap(src)

        # wayback chrome images (toolbar icons etc.)
        if is_wb_infra(src) or is_wb_infra(orig):
            # only remove if it's not inside original content
            if not img.find_parent(class_="post-frame") and not img.find_parent(class_="top-nav"):
                img.decompose()
                continue

        m = MRRRGN_STATIC.match(orig)
        if m:
            fname = m.group(1)
            img["src"] = f"../assets/{fname}"
            assets.append((wayback_download_url(src), orig, fname))
        elif "twitter" in orig.lower() and img.find_parent("a"):
            # twitter bird SVG — keep the reference but point to local asset
            fname = "twitterbird.svg"
            img["src"] = f"../assets/{fname}"
            assets.append((wayback_download_url(src), orig, fname))

    # ── favicon ──────────────────────────────────────────────────────────
    for link in soup.find_all("link", rel="shortcut icon"):
        href = link.get("href", "")
        orig = unwrap(href)
        m = MRRRGN_STATIC.match(orig)
        if m:
            fname = m.group(1)
            link["href"] = f"../assets/{fname}"
            assets.append((wayback_download_url(href), orig, fname))

    # ── anchor links ─────────────────────────────────────────────────────
    for a in list(soup.find_all("a")):
        href = a.get("href", "")
        onclick = a.get("onclick", "")
        orig = unwrap(href)

        # twitter → blog (check both href and onclick, since the original used onclick)
        if ("twitter.com/mrrrgn" in orig or "twitter.com/mrrrgn" in href
                or "twitter.com/mrrrgn" in onclick):
            a["href"] = "https://usize.github.io/blog"
            if a.get("onclick"):
                del a["onclick"]
            continue

        # internal post links
        m = MRRRGN_POST.match(orig)
        if m:
            a["href"] = f"../{m.group(1)}/"
            continue

        # home
        if MRRRGN_ROOT.match(orig):
            a["href"] = "../"
            continue

        # sections / rss / license
        m = MRRRGN_PAGE.match(orig)
        if m:
            a["href"] = f"../{m.group(1)}/"
            continue

        # radio.mrrrgn.com or any other mrrrgn subdomain — unwrap but leave as-is
        if href != orig:
            a["href"] = orig

    # ── iframes (youtube embeds, etc.) ───────────────────────────────────
    for iframe in soup.find_all("iframe"):
        src = iframe.get("src", "")
        orig = unwrap(src)
        if orig != src:
            iframe["src"] = orig

    # ── remaining scripts with wayback-wrapped src ───────────────────────
    for script in soup.find_all("script"):
        src = script.get("src", "")
        if src:
            orig = unwrap(src)
            if orig != src:
                script["src"] = orig

    # ── reconstruct clean document ───────────────────────────────────────
    # The Wayback capture shoves scripts before <head>, making the DOM messy.
    # Extract <head> and <body> and rebuild a clean shell.
    head = soup.find("head")
    body = soup.find("body")

    # Ensure charset meta is inside <head>
    if head:
        existing_meta = head.find("meta", attrs={"charset": True})
        if not existing_meta:
            meta = soup.new_tag("meta", charset="UTF-8")
            head.insert(0, meta)

    # Strip stray top-level <meta charset> that ended up outside <head>
    for meta in soup.find_all("meta", attrs={"charset": True}):
        if meta.parent and meta.parent.name != "head":
            meta.decompose()

    if head and body:
        out = f"<!DOCTYPE html>\n<html>\n{head}\n{body}\n</html>\n"
    else:
        out = str(soup)

    return out, assets


# ── main ─────────────────────────────────────────────────────────────────────


def main():
    if not RAW_DIR.exists():
        RAW_DIR.mkdir()
        print(f"Created {RAW_DIR}/ — save Wayback page sources there (e.g. 21.html, 22.html)")
        print("Then run again.")
        sys.exit(0)

    html_files = sorted(RAW_DIR.glob("*.html"))
    if not html_files:
        print(f"No .html files in {RAW_DIR}/")
        sys.exit(1)

    SITE_DIR.mkdir(exist_ok=True)
    ASSETS_DIR.mkdir(exist_ok=True)

    all_assets: list[tuple[str, str, str]] = []

    for path in html_files:
        post_id = path.stem
        print(f"\n=== post {post_id} ===")
        raw = path.read_text(encoding="utf-8", errors="replace")
        cleaned, assets = clean(raw, post_id)

        out_dir = SITE_DIR / post_id
        out_dir.mkdir(exist_ok=True)
        (out_dir / "index.html").write_text(cleaned, encoding="utf-8")
        print(f"  → {out_dir}/index.html")
        all_assets.extend(assets)

    # dedupe and download
    seen = set()
    to_dl = []
    for wb, orig, fname in all_assets:
        if fname not in seen:
            seen.add(fname)
            to_dl.append((wb, orig, fname))

    if to_dl:
        print(f"\n=== downloading {len(to_dl)} assets ===")
        for wb, orig, fname in to_dl:
            download(wb, orig, ASSETS_DIR / fname)

    print(f"\nDone. Output in {SITE_DIR}/")


if __name__ == "__main__":
    main()
