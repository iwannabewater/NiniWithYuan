#!/usr/bin/env bash
# Rebuild the bundled LXGW WenKai WOFF2 subsets from the pinned upstream release.
#
# Run this whenever new Chinese copy reaches a runtime source file. The
# `tests/typography-copy-v1_4_0.js` guard fails when a runtime glyph is missing
# from either subset, which is the signal to run this script.
#
# Requires: python3, curl, and network access to the pinned GitHub release.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="${FONT_BUILD_DIR:-$(mktemp -d)}"
UPSTREAM_TAG="v1.522"
BASE_URL="https://github.com/lxgw/LxgwWenKai/releases/download/${UPSTREAM_TAG}"

# Recorded in assets/fonts/NOTICE.md. A mismatch means the upstream artifact
# changed and the notice must be reviewed before shipping.
REGULAR_SHA="39ad71264b588165b469e35e6afb162a378dacd1f95348160240ba9038ac3009"
MEDIUM_SHA="d4bdeb38a39151d74d084cba5090f8cb7d20bf83eedb78c35939ae70b9f4e3f6"

echo "Working directory: ${WORK}"
cd "${WORK}"

verify() {
  local file="$1" expected="$2"
  local actual
  actual="$(shasum -a 256 "${file}" | awk '{print $1}')"
  if [ "${actual}" != "${expected}" ]; then
    echo "Checksum mismatch for ${file}" >&2
    echo "  expected ${expected}" >&2
    echo "  actual   ${actual}" >&2
    exit 1
  fi
}

echo "Downloading LXGW WenKai ${UPSTREAM_TAG} sources"
curl -sL --retry 2 -o LXGWWenKai-Regular.ttf "${BASE_URL}/LXGWWenKai-Regular.ttf"
curl -sL --retry 2 -o LXGWWenKai-Medium.ttf "${BASE_URL}/LXGWWenKai-Medium.ttf"
verify LXGWWenKai-Regular.ttf "${REGULAR_SHA}"
verify LXGWWenKai-Medium.ttf "${MEDIUM_SHA}"

echo "Preparing fonttools"
python3 -m venv fontenv
./fontenv/bin/pip install --quiet fonttools brotli

echo "Collecting runtime code points"
REPO_ROOT="${REPO_ROOT}" ./fontenv/bin/python - <<'PY' > unicodes.txt
import os, pathlib
from fontTools.ttLib import TTFont

repo = pathlib.Path(os.environ["REPO_ROOT"])
# Every source that can contain user-visible text.
sources = ["index.html", "styles.css", "manifest.webmanifest", "src/game.js"]
sources += sorted(str(p.relative_to(repo)) for p in (repo / "src/core").glob("*.js"))
sources += sorted(str(p.relative_to(repo)) for p in (repo / "src/render").glob("*.js"))

points = set()
for source in sources:
    points |= {ord(c) for c in (repo / source).read_text(encoding="utf8") if ord(c) > 31}

# Keep everything the shipped subsets already carried so no historical string
# can silently regress to a fallback font.
for existing in ("assets/fonts/lxgw-wenkai-500.woff2", "assets/fonts/lxgw-wenkai-700.woff2"):
    path = repo / existing
    if not path.exists():
        continue
    font = TTFont(path)
    points |= set(font.getBestCmap().keys())
    font.close()

points |= set(range(0x20, 0x7F))
points |= {
    0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x00B7, 0x3001, 0x3002, 0xFF0C, 0xFF1A,
    0xFF1B, 0xFF01, 0xFF1F, 0xFF08, 0xFF09, 0x300A, 0x300B, 0x3010, 0x3011, 0x2014,
    0x2013, 0x00D7, 0x2605, 0x2606, 0x2666, 0x25C7, 0x2726, 0x2727, 0x2665, 0x266A,
    0x266C, 0x25D0, 0x25CC, 0x2039, 0x203A,
}
print(",".join("U+%04X" % p for p in sorted(points)))
PY

subset() {
  local source="$1" output="$2"
  ./fontenv/bin/pyftsubset "${source}" \
    --unicodes-file=unicodes.txt \
    --layout-features='' \
    --no-hinting \
    --desubroutinize \
    --drop-tables+=DSIG \
    --name-IDs='*' --name-legacy --name-languages='*' \
    --flavor=woff2 \
    --output-file="${output}"
}

echo "Subsetting"
subset LXGWWenKai-Regular.ttf "${REPO_ROOT}/assets/fonts/lxgw-wenkai-500.woff2"
subset LXGWWenKai-Medium.ttf "${REPO_ROOT}/assets/fonts/lxgw-wenkai-700.woff2"

echo
echo "Bundled checksums (update assets/fonts/NOTICE.md):"
shasum -a 256 "${REPO_ROOT}/assets/fonts/lxgw-wenkai-500.woff2" "${REPO_ROOT}/assets/fonts/lxgw-wenkai-700.woff2"
echo
echo "Now run: node tests/typography-copy-v1_4_0.js"
