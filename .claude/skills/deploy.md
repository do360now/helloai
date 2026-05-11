# Deploy Skill

## When to use
Deploying helloai.com to Azure. Always run `make bump_version` as a **separate** step before building — chaining it with build in one `make` invocation causes VERSION to be read before the bump writes it.

## Steps (run separately, in order)
1. `make bump_version` — increments patch version in Makefile
2. `make build_helloai_app` — Next.js production build (injects NEXT_PUBLIC_APP_VERSION)
3. `make build_helloai_image` — builds Docker image tagged with new version
4. `make push_helloai_image` — pushes to Docker Hub (do360now/helloai-web)
5. `make az_deploy` — updates Azure container tag and restarts the web app

## After deploy
Run `/agent api-smoke-tester` to verify all 7 endpoints are healthy.

## Do NOT use
`make deploy` — it chains bump+build in one invocation (version bug) and also runs `weekly_update` which may overwrite manual data changes.
