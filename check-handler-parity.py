#!/usr/bin/env python3
"""Every document key handler must say what its focused twin says.

WHY THIS EXISTS. A game's keys are written twice: `on key "X"` on the
document, and `if stroke.key is "X"` on the terminal's input. §14's
listener stands down while a field has focus, so exactly one of the pair
runs — which means the pair has to agree, and nothing checked that.

Three bugs came out of the same slip, statements written one key too low:

  * minesweeper's reveal sat under `s`, so walking down with `wasd`
    opened every cell you stepped on;
  * `crawl`'s restart sat under `ArrowDown`, so walking down dealt a new
    dungeon on the first step;
  * and `deepest` was assigned there rather than guarded, so a
    high-water mark could go down.

None is reachable from a unit claim — the fault is in the wiring, not in
any function — and the browser probe cannot see them either: it asks
whether the canvas changed, and a restarted dungeon changes it exactly
as a step does. All three were found by reading one handler against the
other, which is what this does mechanically.
"""

import re
import sys
from pathlib import Path

# `wasd` is the same move by another name. The launch messages promise
# it, so it is document-only by design and its twin is the arrow.
ALIAS = {'a': 'ArrowLeft', 'd': 'ArrowRight', 'w': 'ArrowUp', 's': 'ArrowDown'}


def indent_of(line):
    return len(line) - len(line.lstrip())


def block(lines, start, end):
    """The lines indented under `start`, up to `end`."""
    base = indent_of(lines[start])
    out, i = [], start + 1
    while i < end and (not lines[i].strip() or indent_of(lines[i]) > base):
        out.append(lines[i])
        i += 1
    return out, i


def statements(body):
    """Every `set` in a body, flattened and normalised to one line."""
    joined, out = [], []
    for line in body:
        text = line.strip()
        if not text or text.startswith('#'):
            continue
        joined.append(text)
    text = ' '.join(joined)
    # `set x to (…)` runs to the next `set`, `if`, `when` or end.
    for m in re.finditer(r'(set \w+ to .*?)(?=(?: set | if | when |$))', text):
        out.append(re.sub(r'\s+', ' ', m.group(1)).strip())
    return out


def keys_named(text, pattern):
    """Every key a condition names.

    The focused path does not always spell it plainly: reveal is
    `if (stroke.key is " ") or (stroke.key is "Enter")`, and crawl's
    restart is `if (stroke.key is " ") and crawling.over`. Matching only
    a line that *begins* `if stroke.key is` misses both — which is how
    the first version of this file passed with `crawl`'s bug put back.
    """
    return re.findall(pattern, text)


def handlers(lines, start, end, pattern):
    """key -> statements, plus the statements at branch level."""
    keyed, tail, i = {}, [], start
    base = None
    while i < end:
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        named = keys_named(line.strip(), pattern)
        if named:
            if base is None:
                base = indent_of(line)
            body, i = block(lines, i, end)
            said = statements(body)
            for key in named:
                keyed.setdefault(key, []).extend(said)
            continue
        # A `set` sitting at the branch's own level applies to every key
        # in it — `crawl`'s `if crawling.depth > deepest` is one.
        if base is not None and indent_of(line) <= base and line.strip().startswith(('set ', 'if ')):
            body, j = block(lines, i, end)
            tail.extend(statements([line] + body))
            i = j
            continue
        i += 1
    return keyed, tail


def overlays(lines, pattern):
    """overlay name -> (keyed handlers, branch-level statements)."""
    found = {}
    for i, line in enumerate(lines):
        m = re.match(r'if overlay is "(\w+)"', line.strip())
        if not m:
            continue
        body, end = block(lines, i, len(lines))
        keyed, tail = handlers(lines, i + 1, end, pattern)
        if keyed:
            name = m.group(1)
            prev = found.get(name, ({}, []))
            merged = dict(prev[0])
            for key, sts in keyed.items():
                merged.setdefault(key, []).extend(sts)
            found[name] = (merged, prev[1] + tail)
    return found


def main():
    path = Path(sys.argv[1] if len(sys.argv) > 1 else 'site.zd')
    lines = path.read_text().splitlines()
    split = next(i for i, l in enumerate(lines) if 'on keydown with stroke' in l)

    document = overlays(lines[:split], r'on key "([^"]+)"')
    focused = overlays(lines[split:], r'stroke\.key is "([^"]+)"')

    findings = 0
    checked = 0
    for overlay, (doc_keys, doc_tail) in sorted(document.items()):
        if overlay not in focused:
            continue
        foc_keys, foc_tail = focused[overlay]
        for key, said in sorted(doc_keys.items()):
            twin = ALIAS.get(key, key)
            allowed = set(foc_keys.get(twin, [])) | set(foc_tail) | set(doc_tail)
            for statement in said:
                checked += 1
                if statement in allowed:
                    continue
                elsewhere = [
                    other
                    for other, sts in foc_keys.items()
                    if statement in sts and other != twin
                ]
                if elsewhere:
                    print(
                        f"{path}: `{overlay}` — `on key \"{key}\"` does what the "
                        f"focused path does under {', '.join(repr(k) for k in elsewhere)}:"
                    )
                    print(f"    {statement}")
                    findings += 1
    print(
        f"handler parity: {findings} finding(s) across {checked} statements "
        f"in {len(document)} overlays"
    )
    return 1 if findings else 0


if __name__ == '__main__':
    sys.exit(main())
