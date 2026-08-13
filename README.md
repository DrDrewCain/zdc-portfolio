# zdc-portfolio

marksturman.com, rebuilt in ZDeceptron. In progress.

```
zdc dev ./blog.zd      --port 4395    # the writing, read off disk
zdc dev ./twenty48.zd  --port 4396    # the game
```

Note the `./`. `zdc build blog.zd` fails with "the project directory ``
could not be resolved" — the project root is the entry's parent, and a bare
filename has none.

## What is done

| | |
|---|---|
| `blog.zd` | 14 posts, read from `content/blog/*.mdx` at build time. Front matter parsed in the language; bodies rendered by `build markdown`. 16 documents out. |
| `frontmatter.zd` | a `key: value` header reader — the library `examples/blog.zd` said was missing |
| `twenty48.zd` | the 2048 game, ported from the pure TypeScript engine |

## What the compiler needed

Two fixes went upstream while building this, both found because a real site
does things an example does not:

- **Asset stylesheets were linked document-relative** (`./assets/x.css`), so
  every nested route rendered unstyled. Now root-absolute.
- **`Select` showed a variant's identifier**, so a dropdown read `DirtBike`.
  Variants take labels now.

## What it cannot do yet

- **A route parameter cannot enumerate over `build list`.** The slugs are
  written out in `blog.zd` while the posts themselves are read from disk,
  because `in` needs a literal `static` list. Adding a post is two edits.
- **`assets/` is one CSS namespace.** Every stylesheet in it is linked into
  every document the project emits, whichever program it belongs to — so
  `.page` in the game's sheet fought `.page` in the blog's. Classes here are
  prefixed to keep out of each other's way.
- **MDX with embedded components.** Every file in `content/` is plain
  markdown today, so nothing is lost yet.
