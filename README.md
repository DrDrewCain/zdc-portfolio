# zdc-portfolio

[marksturman.com](https://marksturman.com), written in
[ZDeceptron](https://github.com/DrDrewCain/zdeceptron) rather than in
TypeScript. 24 modules, 13,716 lines, one router, a blog rendered from
markdown at build time, and eleven games you can play in a terminal.

```sh
zdc build ./site.zd --out site     # 33 documents, plus four generated files
zdc dev ./site.zd --port 4395      # the same thing, rebuilding as you edit
./test.sh                          # 144 claims across 15 suites
./browser/run.sh                   # and one question a claim cannot ask
```

## What it is

The original is a Next.js 16 / React 19 site of 100 non-test modules and
14,499 lines. This is that site, and the comparison is measured rather than
claimed — `EXPRESSIBILITY.md` in the compiler's repository has the method.

| | |
|---|---|
| the site | a home page, a blog index, 14 posts, 16 project pages, a 404 |
| the terminal | `~` opens it anywhere; `help` lists what it takes |
| the games | 2048, snake, blocks, minesweeper, codebreak, lexer, life, trader, a dungeon crawl, a critter lab, and a runner |
| generated | `rss.xml`, `sitemap.xml`, `robots.txt`, `llms.txt` |

Everything under `content/` is read at build time. A post is a markdown
file with a `key: value` header; a project is the same. Nothing is fetched
at run time, and there is no server: `zdc build` writes a directory any
static host will serve.

## What is checked

`./test.sh` runs every `*.test.zd` and then builds the program, because a
program is more than its modules — §14D.2 makes every top-level name across
a program *and the files it imports* unique, and only the assembled program
has that property. Checking each file alone reported 39 modules and 0
diagnostics while `site.zd` would not build.

The claims are about the rules that are easy to get wrong and hard to
notice: that a repeated letter is scored once, that a merged tile does not
merge again, that the edges of a minefield are real, that a mirrored sprite
is mirrored. Each was written by breaking the rule first and checking the
claim complained.

`./browser/run.sh` asks the one question a claim cannot. `zdc test`
evaluates on the build host, where nothing has focus; which key listener
stands down while a field has focus is a browser's rule. Every game was
unplayable for a reader who clicked the board — 144 claims held throughout.

## What is not ported

About a quarter of the original by line, and two of the groups are not
work that should be done:

- **Spotify, with its OAuth exchange.** Refused by the language: a PKCE
  verifier is a `secret`, and no browser store may hold one.
- **React hydration scaffolding.** The compiler adopts a served tree
  natively, so there is nothing here for it to scaffold.

The rest is work: MDX with embedded components, the docs section, and OG
images. Two more — a WebGL hero and a tmux-style status bar — are waiting
on `IntersectionObserver`, which the compiler does not have yet.

## What building this changed in the compiler

A real site does things an example does not, and each of these was found
here and fixed upstream:

- asset stylesheets were linked document-relative, so every nested route
  rendered unstyled;
- `Select` showed a variant's identifier, so a dropdown read `DirtBike`;
- no program with a `request` or a server read had ever been prerendered,
  because the pass dropped an import's renames.

## What it still cannot do

- **A route parameter cannot enumerate over `build list`.** The slugs are
  written out in `posts.zd` while the posts themselves are read from disk,
  because `in` needs a literal `static` list. Adding a post is two edits.
- **`assets/` is one CSS namespace.** Every stylesheet is linked into every
  document, so classes here are prefixed to keep out of each other's way.
