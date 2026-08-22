#!/bin/sh
# Every claim this port makes about itself.
#
# `zdc test` takes one file, so twelve suites are twelve invocations — and a
# suite nobody can run in one command is a suite that stops being run. This
# aggregates them and fails if any claim breaks, which is what a CI step or a
# pre-commit hook needs.
#
#   ./test.sh              uses `zdc` from PATH
#   ZDC=path/to/zdc ./test.sh
#
# The verdict is the exit code and not the output. A suite whose claims all
# hold ends with "14 held"; one with a broken claim ends with an ariadne
# diagnostic whose last line is box-drawing, so reading the tail for a
# summary reports success on exactly the runs that matter. The first version
# of this script did that and passed a deliberately broken suite.
set -u
ZDC="${ZDC:-zdc}"
suites=0
broken=0
held=0

for suite in *.test.zd; do
    [ -e "$suite" ] || continue
    suites=$((suites + 1))
    out=$("$ZDC" test "./$suite" 2>&1) && status=0 || status=$?
    if [ "$status" -ne 0 ]; then
        broken=$((broken + 1))
        printf '%-22s BROKEN\n' "$suite"
        printf '%s\n' "$out" | grep -E '^  broken' || true
    else
        n=$(printf '%s' "$out" | grep -oE '^[0-9]+ held' | grep -oE '^[0-9]+' || echo 0)
        held=$((held + n))
        printf '%-22s %s held\n' "$suite" "$n"
    fi
done

# The claims pass on modules; a program is more than its modules. §14D.2
# makes every top-level name across a program *and the files it imports*
# unique, and that is a property only the assembled program has — checking
# each file alone reported 39 modules and 0 diagnostics while `site.zd`
# would not build, because `llms.zd` and `commands.zd` both declared
# `nowLines`. So the build runs here too.
echo
printf '%-22s ' "site.zd"
if OUT=$(mktemp -d) && "$ZDC" build ./site.zd --out "$OUT" >/dev/null 2>&1; then
    docs=$(find "$OUT" -name '*.html' | wc -l | tr -d ' ')
    files=$(ls "$OUT"/*.xml "$OUT"/*.txt 2>/dev/null | wc -l | tr -d ' ')
    echo "builds — $docs documents, $files generated files"
    # A dead link is not a broken build, which is why it needs asking for:
    # the blog linked to `/rss.xml` for weeks before the feed existed.
    if ! python3 browser/links.py "$OUT"; then
        broken=$((broken + 1))
    fi
    rm -rf "$OUT"
else
    echo "DOES NOT BUILD"
    "$ZDC" build ./site.zd --out "$OUT" 2>&1 | head -6
    rm -rf "$OUT"
    broken=$((broken + 1))
fi

echo
if [ "$broken" -gt 0 ]; then
    echo "$broken of $suites suites have a broken claim"
    exit 1
fi
echo "$held claims held across $suites suites"
