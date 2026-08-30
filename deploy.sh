#!/usr/bin/env bash
# deploy.sh — bump, image, push, Azure rollout, smoke https://helloai.com
#
# Uses the Makefile targets (source of truth). Does NOT run `make deploy`
# (that also runs weekly_update) and does NOT call `az_deploy` (that tails
# logs forever). bump_version is always its own make invocation so VERSION
# is re-read before the image build.
#
# Usage:
#   ./deploy.sh
#   ./deploy.sh --dry-run
#   ./deploy.sh --skip-bump          # rebuild/push/roll current VERSION
#   ./deploy.sh --skip-checks        # skip jest / tsc / verify-all-agents
#   ./deploy.sh --local-build        # also run make build_helloai_app
#   ./deploy.sh --skip-azure         # stop after docker push
#   ./deploy.sh --skip-smoke         # skip live /api/status wait + endpoint checks

# Unattended Azure auth (does not replace azure@helloai.com in ~/.azure):
#   $HOME/.config/helloai/az-sp.env  (mode 600)
#   sourced only for this script; az login --service-principal uses a temp
#   AZURE_CONFIG_DIR so the interactive user account stays the default.
#

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

SITE_URL="${SITE_URL:-https://helloai.com}"
SMOKE_TIMEOUT_SEC="${SMOKE_TIMEOUT_SEC:-480}"
SMOKE_INTERVAL_SEC="${SMOKE_INTERVAL_SEC:-10}"
# Match Makefile: rootless per-user socket unless the caller already set one.
export DOCKER_HOST="${DOCKER_HOST:-unix:///run/user/1000/docker.sock}"

DRY_RUN=0
SKIP_BUMP=0
SKIP_CHECKS=0
SKIP_AZURE=0
SKIP_SMOKE=0
LOCAL_BUILD=0

usage() {
  cat <<'EOF'
deploy.sh — bump, image, push, Azure rollout, smoke https://helloai.com

Uses Makefile targets. Does not run `make deploy` (that also runs
weekly_update) and does not call `az_deploy` (that tails logs forever).
bump_version is always its own make invocation so VERSION is re-read
before the image build.

Usage:
  ./deploy.sh
  ./deploy.sh --dry-run
  ./deploy.sh --skip-bump          rebuild/push/roll current VERSION
  ./deploy.sh --skip-checks        skip jest / tsc / verify-all-agents
  ./deploy.sh --local-build        also run make build_helloai_app
  ./deploy.sh --skip-azure         stop after docker push
  ./deploy.sh --skip-smoke         skip live /api/status wait + endpoint checks
EOF
  exit 0
}

log()  { printf '%s\n' "$*"; }
step() { printf '\n==> %s\n' "$*"; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

run() {
  if (( DRY_RUN )); then
    printf '  [dry-run] %s\n' "$*"
    return 0
  fi
  printf '  $ %s\n' "$*"
  eval "$@"
}

need() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

HELLOAI_AZ_SP_ENV="${HELLOAI_AZ_SP_ENV:-$HOME/.config/helloai/az-sp.env}"
AZURE_CONFIG_DIR_TMP=""

cleanup_deploy() {
  [[ -n "${SMOKE_BODY:-}" ]] && rm -f "$SMOKE_BODY"
  [[ -n "${AZURE_CONFIG_DIR_TMP:-}" ]] && rm -rf "$AZURE_CONFIG_DIR_TMP"
}
trap cleanup_deploy EXIT

azure_sp_login() {
  if [[ ! -f "$HELLOAI_AZ_SP_ENV" ]]; then
    log "Azure: no SP env at $HELLOAI_AZ_SP_ENV — using current az login"
    return 0
  fi
  # shellcheck disable=SC1090
  source "$HELLOAI_AZ_SP_ENV"
  : "${AZURE_CLIENT_ID:?missing AZURE_CLIENT_ID in $HELLOAI_AZ_SP_ENV}"
  : "${AZURE_CLIENT_SECRET:?missing AZURE_CLIENT_SECRET in $HELLOAI_AZ_SP_ENV}"
  : "${AZURE_TENANT_ID:?missing AZURE_TENANT_ID in $HELLOAI_AZ_SP_ENV}"
  : "${AZURE_SUBSCRIPTION_ID:?missing AZURE_SUBSCRIPTION_ID in $HELLOAI_AZ_SP_ENV}"
  AZURE_CONFIG_DIR_TMP="$(mktemp -d "${TMPDIR:-/tmp}/helloai-az.XXXXXX")"
  export AZURE_CONFIG_DIR="$AZURE_CONFIG_DIR_TMP"
  az login --service-principal \
    --username "$AZURE_CLIENT_ID" \
    --password "$AZURE_CLIENT_SECRET" \
    --tenant "$AZURE_TENANT_ID" \
    --output none
  az account set --subscription "$AZURE_SUBSCRIPTION_ID"
  log "Azure: service principal login (isolated AZURE_CONFIG_DIR, user ~/.azure untouched)"
}


makefile_version() {
  grep '^VERSION=' Makefile | cut -d'=' -f2
}

next_patch() {
  local current major minor patch
  current="$(makefile_version)"
  major="${current%%.*}"
  minor="${current#*.}"; minor="${minor%%.*}"
  patch="${current##*.}"
  printf '%s.%s.%s\n' "$major" "$minor" "$((patch + 1))"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage ;;
    --dry-run) DRY_RUN=1 ;;
    --skip-bump) SKIP_BUMP=1 ;;
    --skip-checks) SKIP_CHECKS=1 ;;
    --skip-azure) SKIP_AZURE=1 ;;
    --skip-smoke) SKIP_SMOKE=1 ;;
    --local-build) LOCAL_BUILD=1 ;;
    *) die "unknown argument: $1 (try --help)" ;;
  esac
  shift
done

if (( SKIP_AZURE )); then
  SKIP_SMOKE=1
fi

BEFORE="$(makefile_version)"
if (( SKIP_BUMP )); then
  AFTER="$BEFORE"
else
  AFTER="$(next_patch)"
fi

log "HelloAi deploy"
log "  repo:    $ROOT"
log "  version: $BEFORE → $AFTER"
log "  site:    $SITE_URL"
(( DRY_RUN )) && log "  mode:    dry-run"

# ── preflight ──────────────────────────────────────────────
step "Preflight"
need make
need docker
need curl
need python3
if (( ! SKIP_AZURE )); then
  need az
fi

if (( ! DRY_RUN )); then
  docker info >/dev/null 2>&1 || die "docker daemon not reachable (check DOCKER_HOST / rootless socket)"
  if (( ! SKIP_AZURE )); then
    azure_sp_login
    make test_deploy
  fi
fi

# ── checks ─────────────────────────────────────────────────
if (( ! SKIP_CHECKS )); then
  step "Validate (jest, tsc, agent hashes)"
  run "npx jest --silent"
  run "npx tsc --noEmit"
  run "./verify-all-agents.sh"
else
  log "Skipping pre-deploy checks"
fi

# ── version ────────────────────────────────────────────────
# MUST be a separate make invocation. Chaining bump_version with a build
# target in one make reads VERSION before the bump writes it.
if (( SKIP_BUMP )); then
  step "Keeping VERSION=$BEFORE"
else
  step "Bump version ($BEFORE → $AFTER)"
  run "make bump_version"
  if (( ! DRY_RUN )); then
    AFTER="$(makefile_version)"
    [[ "$AFTER" == "$BEFORE" ]] && die "VERSION did not change after make bump_version"
  fi
fi
log "  Building/pushing tag: $AFTER"

# ── build / push ───────────────────────────────────────────
if (( LOCAL_BUILD )); then
  step "Local Next.js production build"
  run "make build_helloai_app"
fi

step "Docker image $AFTER"
run "make build_helloai_image"

step "Push do360now/helloai-web:$AFTER and :latest"
run "make push_helloai_image"

# ── Azure ──────────────────────────────────────────────────
# az_deploy also runs `az webapp log tail` (blocks until Ctrl+C).
# Roll out with set-tag + restart only.
if (( ! SKIP_AZURE )); then
  step "Azure set tag + restart"
  run "make az_set_tag"
  run "make az_restart"
  log "  Azure pointing at do360now/helloai-web:$AFTER"
else
  log "Skipping Azure rollout"
fi

# ── wait for the new version ───────────────────────────────
wait_for_version() {
  local deadline body version status
  deadline=$((SECONDS + SMOKE_TIMEOUT_SEC))
  step "Wait for $SITE_URL/api/status version=$AFTER (timeout ${SMOKE_TIMEOUT_SEC}s)"
  if (( DRY_RUN )); then
    log "  [dry-run] would poll until version == $AFTER"
    return 0
  fi
  while (( SECONDS < deadline )); do
    if body="$(curl -fsS -m 20 "$SITE_URL/api/status" 2>/dev/null)"; then
      version="$(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("version",""))' <<<"$body")"
      status="$(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("status",""))' <<<"$body")"
      log "  /api/status status=$status version=$version"
      if [[ "$status" == "ok" && "$version" == "$AFTER" ]]; then
        log "  Live version matches $AFTER"
        return 0
      fi
    else
      log "  /api/status not ready yet"
    fi
    sleep "$SMOKE_INTERVAL_SEC"
  done
  die "timed out waiting for /api/status version=$AFTER (still rolling or CDN cache). Check: make az_logs"
}

SMOKE_BODY="$(mktemp)"

smoke() {
  local path="$1" url code
  url="$SITE_URL$path"
  if (( DRY_RUN )); then
    log "  [dry-run] GET $url"
    return 0
  fi
  code="$(curl -fsS -m 20 -o "$SMOKE_BODY" -w '%{http_code}' "$url")"
  log "  GET $path → $code"
  python3 -c '
import json, sys
path, body = sys.argv[1], sys.argv[2]
with open(body) as f:
    data = json.load(f)
if path == "/api/status":
    assert data.get("status") == "ok", data
    assert data.get("version"), data
    assert "endpoints" in data
elif path.startswith("/api/models"):
    assert isinstance(data.get("models"), list) and data["models"], data
    assert data.get("count") == len(data["models"]), data
elif path.startswith("/api/recommend"):
    assert data.get("recommendations"), data
    assert "query" in data
elif path == "/api/openapi.json":
    assert str(data.get("openapi", "")).startswith("3."), data
    assert "/api/recommend" in data.get("paths", {})
elif path == "/.well-known/ai-plugin.json":
    assert data.get("name_for_human")
    assert "openapi.json" in (data.get("api") or {}).get("url", "")
' "$path" "$SMOKE_BODY"
}

if (( ! SKIP_SMOKE )); then
  wait_for_version
  step "Smoke public endpoints"
  smoke /api/status
  smoke /api/models
  smoke "/api/models?provider=Anthropic"
  smoke "/api/recommend?task=coding"
  smoke "/api/recommend?task=reasoning&max_cost=20"
  smoke /api/openapi.json
  smoke /.well-known/ai-plugin.json
else
  log "Skipping live smoke tests"
fi

log ""
log "Done. do360now/helloai-web:$AFTER"
log "  site: $SITE_URL"
if (( ! SKIP_BUMP && ! DRY_RUN )); then
  log "  Makefile VERSION is now $AFTER (commit it when you want)."
fi
