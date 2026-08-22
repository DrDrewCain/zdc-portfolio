#!/usr/bin/env python3
"""Every internal link points at a document this build emitted.

WHY THIS EXISTS. The blog page linked to `/rss.xml` from the commit that
styled it, and the feed answering that link was written weeks later. In
between, a reader who clicked it got nothing, every page still rendered,
and nothing here had anything to say — a dead link is not a broken build.

Run over the *output* rather than the source, because that is where the
question lives: a link is dead when the file it names is not in the
directory the host will serve.
"""

import pathlib
import re
import sys


def served(root):
    """Every path this build answers, as a URL."""
    out = set()
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(root)
        if p.name == "index.html":
            url = "/" + str(rel.parent).strip(".").strip("/")
            out.add("/" if url == "/" else url.rstrip("/") + "/")
        else:
            out.add("/" + str(rel))
    return out


def main():
    root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "site")
    if not root.is_dir():
        print("no such build directory: %s" % root)
        return 1

    answers = served(root)
    dead, checked = [], 0
    for page in sorted(root.rglob("*.html")):
        for m in re.finditer(r'href="(/[^"#?]*)"', page.read_text()):
            href = m.group(1)
            checked += 1
            # A directory route is written both ways in the wild, so a link
            # is alive if either spelling is served.
            if href in answers or href.rstrip("/") + "/" in answers:
                continue
            dead.append((str(page.relative_to(root)), href))

    print("  internal links: %d checked, %d dead" % (checked, len(dead)))
    for page, href in dead:
        print("    %s -> %s" % (page, href))
    return 1 if dead else 0


if __name__ == "__main__":
    sys.exit(main())
