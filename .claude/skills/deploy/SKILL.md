---
name: deploy
description: Deploy helloai.com to Azure. Runs the full build-tag-push-deploy pipeline. Manual only — do not invoke automatically.
disable-model-invocation: true
---

# Deploy Skill

## When to use
Deploying helloai.com to Azure. Always run `make bump_version` as a **separate** step before building — chaining it with build in one `make` invocation causes VERSION to be read before the bump writes it.

## Steps (run separately, in order)
1. `make bump_version` — increments patch version in Makefile
2. `make build_helloai_app` — Next.js production build (injects NEXT_PUBLIC_APP_VERSION)
3. `make build_helloai_image` — builds Docker image tagged with new version
4. `make stamp_views` — reads the live view totals and layers them onto that image (`scripts/snapshot_views.py`). The new process adds to those totals. If the read fails, stop; do not push an image that would start the counter over.
5. `make push_helloai_image` — pushes to Docker Hub (do360now/helloai-web)
6. `make az_deploy` — enables persistent `/home` when it is off, then updates the Azure container tag and restarts the web app

`./deploy.sh` runs steps 1–6 (and the smoke checks) with `bump_version` in its own make invocation.

## After deploy
Run `/agent api-smoke-tester` to verify all public endpoints are healthy.

## Do NOT use
`make deploy` also runs the full `weekly_update` (auto-commit/push) — use the individual targets when you only want build+push+deploy.
