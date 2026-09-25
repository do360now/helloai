#!/usr/bin/env bash
# Smoke-check both OG image routes: 200, image/png, > 10 KB.
# Usage: scripts/og_smoke.sh [BASE_URL]   (default http://localhost:3000)
set -eu
cd "$(dirname "$0")/.."
BASE="${1:-http://localhost:3000}"
SLUG=$(node -e "console.log(require('./data/articles.json')[0].slug)")
fail=0
BODY=$(mktemp)
trap 'rm -f "$BODY"' EXIT
for path in "/opengraph-image" "/articles/${SLUG}/opengraph-image"; do
  out=$(curl -s -o "$BODY" -w '%{http_code} %{content_type} %{size_download}' "${BASE}${path}" || true)
  read -r code ctype size <<<"$out"
  if [ "$code" = "200" ] && [ "$ctype" = "image/png" ] && [ "${size:-0}" -gt 10240 ]; then
    echo "PASS ${path} ${code} ${ctype} ${size}B"
  else
    echo "FAIL ${path} ${code} ${ctype} ${size}B"; fail=1
  fi
done
exit $fail
