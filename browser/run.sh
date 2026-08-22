#!/bin/sh
# Build the site, drive it in a real browser, and fail if a game is stuck.
#
#   ./browser/run.sh
#   ZDC=path/to/zdc CHROME=path/to/chrome ./browser/run.sh
#
# A browser and not the embedded engine, because the question is about
# focus — which key listener stands down while a field has focus is a
# browser's rule, and `zdc test` evaluates claims on the build host where
# there is no focus to have.
set -eu
ZDC="${ZDC:-zdc}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PORT="${PORT:-8137}"
OUT=$(mktemp -d)
PROFILE=$(mktemp -d)

cleanup() {
    [ -n "${SERVER:-}" ] && kill "$SERVER" 2>/dev/null || true
    rm -rf "$OUT" "$PROFILE"
}
trap cleanup EXIT

"$ZDC" build ./site.zd --out "$OUT" >/dev/null
cp browser/keys.js "$OUT/keys.js"
# The document carries `script-src 'self'` (#146), so the probe is a file
# beside the bundle rather than an inline script — an inline one is blocked
# and its verdict comes back empty, which reads as a failure it did not
# cause.
python3 - "$OUT/index.html" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
p.write_text(p.read_text().replace(
    "</body>",
    '<pre id="verdict"></pre><script type="module" src="./keys.js"></script></body>'))
PY

(cd "$OUT" && python3 -m http.server "$PORT" >/dev/null 2>&1) &
SERVER=$!
sleep 2

DOM=$(mktemp)
# `timeout`, because `--dump-dom` is documented to exit and does not: it
# writes a complete DOM and then sits while the updater and three crashpad
# handlers run. The artefact is the signal, so the browser is killed once
# it has written one.
timeout "${CHROME_SECONDS:-90}" "$CHROME" --headless=new --disable-gpu --no-sandbox --virtual-time-budget=12000 \
    --no-first-run --disable-extensions --disable-background-networking \
    --dump-dom --user-data-dir="$PROFILE" "http://localhost:$PORT/" 2>/dev/null > "$DOM" || true

VERDICT=$(python3 - "$DOM" <<'PY'
import pathlib, re, sys
m = re.search(r'<pre id="verdict">([^<]*)</pre>', pathlib.Path(sys.argv[1]).read_text())
print(m.group(1) if m else "")
PY
)
rm -f "$DOM"

echo "$VERDICT" | tr '|' '\n' | sed 's/^ *//;s/ *$//' | grep -v '^$' | sed 's/^/  /'

if [ -z "$VERDICT" ]; then
    echo "the probe wrote nothing — it did not run"
    exit 1
fi
if ! echo "$VERDICT" | grep -q "done"; then
    echo "the probe stopped early — a game did not launch"
    exit 1
fi
if echo "$VERDICT" | grep -qE "STUCK|NO-TERMINAL|NO-GRID"; then
    echo "2048 does not answer arrows when the field loses focus"
    exit 1
fi
echo "2048 answers arrows without focus"
