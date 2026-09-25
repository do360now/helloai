#!/usr/bin/env bash
# Step 0 of docs/review/client-ip-and-rate-limit.md: send tagged requests so the
# X-Forwarded-For shape the app sees can be found in the server logs afterwards.
# Run once from each known network (home, phone data). Sends 20 plain requests
# plus ONE request with a fake X-Forwarded-For. Keep it at that: this is a
# measurement, not a rate-limit bypass test.
#
# Usage: scripts/xff_probe.sh [BASE_URL] [LABEL]
set -eu
BASE="${1:-https://helloai.com}"
LABEL="${2:-net}"
TAG="xffprobe-${LABEL}-$(date -u +%Y%m%dT%H%M%SZ)"
echo "probe tag: ${TAG}  (search logs for this User-Agent)"
for i in $(seq 1 20); do
  curl -s -o /dev/null -A "${TAG}-plain-${i}" "${BASE}/api/status"
done
curl -s -o /dev/null -A "${TAG}-fake" -H 'X-Forwarded-For: 203.0.113.9' "${BASE}/api/status"
echo "done: 20 plain + 1 fake (X-Forwarded-For: 203.0.113.9)."
echo "Record in the plan's Findings: is 203.0.113.9 first, last, or absent? Is a :port attached?"
