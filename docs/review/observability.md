# Plan: observability for the free API and the site (review track 7g)

**Author:** Sonnet 5 (helloai-7e), review room `helloai-review`, 2026-09-25
**Executor:** Sonnet or Haiku from a cold session. **Status:** PLAN, nothing implemented.
**Priority:** first. The purpose, app-funnel and monetisation questions (tracks 1, 2, 7e) can't be answered from evidence until this lands.

## Problem

Nobody can say whether anyone uses helloai.com or its API.

Evidence (all read from the repo on 2026-09-25):

- `middleware.ts` only runs on `/api/*` (`config.matcher`). Page views, article reads and clicks out to app.helloai.com are not recorded anywhere. No analytics code under `app/`.
- For `/api/*` the only durable record is stdout, and only for three alerts: `AI_USER_AGENT_DETECTED`, `ANOMALOUS_ACCESS_PATTERN`, `RATE_LIMIT_EXCEEDED`. A normal request writes no log line.
- `lib/request-logger.ts` keeps the full request history in an in-memory array capped at 10,000 entries. It is lost on every restart and deploy, and it exists only to feed `detectAnomalousPattern`.
- `isAIUserAgent` matches `/google/i`, `/meta/i`, `/bot/i`, `/gpt/i`, `/claude/i` and others. Googlebot and any UA containing "bot" are flagged as AI. Any count built on that alert overstates agents.
- `/api/pro/recommend` already has durable demand logging (`lib/pay/metrics.ts`, one `[pro-metrics]` line per request, spec in `docs/pro-metrics-spec.md`). The free API and the site do not.
- Production logs were not readable in the review session (a read-only `az webapp log download` was denied by the permission layer). So there is **no baseline**. Measurement starts from the deploy of this plan.

## Decision needed from cmc

> **Decision status:** on 2026-09-25 the recommended option for each decision below was reported as adopted by cmc ("Let's go with the recommendations already shown in the table"). This was relayed by Fable from cmc's message in its own session; the Sonnet session has not received it from cmc directly. Treat as adopted, pending cmc's confirmation. See `README.md`, "Decisions taken". D4/D5-style texts that cmc must write are not drafted here.


1. Where do counts live? Recommended: **stdout lines only** (the Azure log stream already captures them; same pattern as `[pro-metrics]`), with no new service and no cookies.
2. Page-view analytics: yes or no. Recommended: **no third-party script.** Count outbound clicks to app.helloai.com with a first-party redirect route (see step 5) so there is nothing to consent to. Revisit only if the answer to "does the site feed the app" stays unknowable.
3. Privacy line for the terms text: log a salted, daily-rotating hash of the IP, never the raw IP. Confirm this is acceptable.

## Design (do not add dependencies)

### 1. UA classifier — `lib/ua-class.ts` (new)

`classifyUserAgent(ua: string): 'search_bot' | 'ai_crawler' | 'declared_ai_client' | 'programmatic' | 'browser' | 'tool' | 'empty'`

- `search_bot`: Googlebot, Bingbot, DuckDuckBot, Baiduspider, YandexBot, Applebot.
- `ai_crawler`: GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-User, anthropic-ai, PerplexityBot, Google-Extended, Bytespider, CCBot, Amazonbot.
- `declared_ai_client`: the UA **names** an AI SDK or product: langchain, llamaindex, openai-python, anthropic-sdk, `mcp`, or the request carries an `X-Agent-Id` header. Keep the list short and data-driven (an array at the top of the file). This is still self-declared and spoofable, so the name says "declared", not "autonomous agent".
- `programmatic`: generic HTTP clients that prove nothing about who or what is behind them: `python-requests`, `axios`, `node-fetch`, `undici`, `Go-http-client`, `okhttp`, Java clients, with no browser token. **Do not count these as agents.** Report them separately as "unknown/programmatic" (Astra's challenge, accepted: a generic client is not evidence of autonomous-agent use).
- `browser`: contains `Mozilla/` and one of `Chrome|Safari|Firefox|Edg`.
- `tool`: curl, wget, httpie, Postman.
- `empty`: no UA.

Unknown UAs fall to `declared_ai_client` only if they match the list; otherwise `programmatic` if they match a generic HTTP client, else `tool`. Order matters: check `search_bot` and `ai_crawler` before `browser` (crawlers send `Mozilla/5.0 (compatible; ...)`). Keep `isAIUserAgent` exported for the existing alert, but make it call the classifier so the alert stops firing on Googlebot.

### 2. One structured line per `/api` request — in `middleware.ts`

After the rate-limit decision, emit one line:

```
[api-metrics] {"ts":1790352003887,"path":"/api/recommend","ua":"declared_ai_client","ip_hash":"a1b2c3d4","param_keys":["task","max_cost"],"rate_limited":false}
```

- Prefix `[api-metrics] ` so it is greppable like `[pro-metrics] `.
- The response status is **not** known in middleware. Record `rate_limited` (known there) and leave status out. If status is needed later, wrap route handlers instead (see security-backlog item 8).
- `ip_hash` = first 8 hex chars of `sha256(dailySalt + ip)`. `dailySalt` = `process.env.METRICS_SALT + UTC date`. If `METRICS_SALT` is unset, use `'dev'` (hashes are then guessable, which is acceptable in dev only). Never log the raw IP in this line.
- Log param **keys**, not values (values can carry user text).
- Wrap in `try/catch`. Observability must never break a request. Toggle: `API_METRICS_STDOUT` (default `"true"`), read at call time.
- Put the formatting in `lib/api-metrics.ts` (new) so it is unit-testable without the middleware.

### 3. Surface the counters — `/api/status`

Add `usage` to the `/api/status` response: request count since process start by `ua` class and by path, plus `since` (process start ISO time). Keep it in a module-level `Map` in `lib/api-metrics.ts`. State plainly in the field docs that it **resets on restart and covers only this container instance**; the durable source is the stdout lines.

Add the new field to `app/api/openapi.json/route.ts`. `__tests__/openapi-consistency.test.ts` will fail if the spec and the route drift, so update both.

### 4. Counting the pro endpoint together with the free one

`[pro-metrics]` and `[api-metrics]` stay separate prefixes. Do not merge them. Add a short "how to read the logs" section to `docs/pro-demand-report-spec.md` pointing here, with the two grep commands.

### 5. Outbound clicks to app.helloai.com (only if decision 2 = first-party redirect)

- New route `app/go/[dest]/route.ts`. `dest` is looked up in a fixed allow-list object (`{ app: 'https://app.helloai.com', channels: 'https://app.helloai.com/channels/summarize' }`). Unknown keys return 404. **Never redirect to a URL taken from the request** (open-redirect risk).
- It emits `[go-metrics] {"ts":...,"dest":"app","from":"hero-cta"}` and returns a 302. `from` comes from a `?from=` param restricted to `^[a-z0-9-]{1,32}$`.
- Replace the three link targets (Hero secondary CTA, "Start a conversation", concepts page) with `/go/app?from=...`. Update `app/components/Hero.tsx` and `app/concepts/agent-social`.
- Add `/go/` to `robots.ts` disallow.
- Note: with Next `output: 'standalone'` and one container this works as-is.

### 6. Weekly report

Add `scripts/api_usage_report.py`: reads a saved log file (`az webapp log tail` output redirected by the operator) and prints counts by day, `ua` class, path, distinct `ip_hash` per day, top `param_keys`, and `go-metrics` click counts. It must exit 0 with a message when the file is missing (same convention as `check_cluster_bench.py`). Pure stdlib.

## Tests (write first)

- `__tests__/ua-class.test.ts`: Googlebot → `search_bot`; `Mozilla/5.0 (compatible; GPTBot/1.0)` → `ai_crawler` (not `browser`); Chrome desktop → `browser`; `curl/8.5` → `tool`; empty → `empty`; `langchain` UA → `declared_ai_client`; `node-fetch`, `undici/6`, `python-requests/2.31` → `programmatic` (never `declared_ai_client`).
- `__tests__/api-metrics.test.ts`: line starts with `[api-metrics] `; JSON parses; contains no raw IP (assert the IP string is absent from the line); param values absent, keys present; a failing `console.log` does not throw; `API_METRICS_STDOUT=false` writes nothing.
- Existing `__tests__/api-routes.test.ts` and `openapi-consistency.test.ts` still pass with the new `usage` field.
- `__tests__/go-route.test.ts` (step 5): known dest → 302 with the allow-listed URL; unknown dest → 404; `?from=` with bad characters → dropped, not reflected.

## Acceptance checks

1. `npx jest` green, `npx tsc --noEmit` clean, `npm run build` succeeds.
2. Local run: `curl -A "Googlebot/2.1" localhost:3000/api/models` produces an `[api-metrics]` line with `"ua":"search_bot"` and **no** `AI_USER_AGENT_DETECTED` alert.
3. `curl localhost:3000/api/status` shows `usage` with non-zero counts after a few calls.
4. `grep '\[api-metrics\]'` over 100 mixed requests contains 100 lines and zero raw IPs.
5. After deploy: `make` log tail (operator) shows `[api-metrics]` lines from real traffic within a day.
6. `./verify-all-agents.sh` unchanged (no agent files touched).

## Files touched

New: `lib/ua-class.ts`, `lib/api-metrics.ts`, `scripts/api_usage_report.py`, `__tests__/ua-class.test.ts`, `__tests__/api-metrics.test.ts`, optionally `app/go/[dest]/route.ts` and its test.
Edited: `middleware.ts`, `lib/request-logger.ts` (use the classifier), `app/api/status/route.ts`, `app/api/openapi.json/route.ts`, `docs/pro-demand-report-spec.md`, optionally `Hero.tsx`, `app/concepts/agent-social/*`, `app/robots.ts`.
Env: add `METRICS_SALT` to the Azure app settings before deploy (operator step, secret value, do not commit).

## Interpreting the numbers (Astra's challenge, accepted)

- Raw request counts must not settle the humans-versus-agents product decision. UA classes are labels on traffic, not proof of intent.
- Report `declared_ai_client`, `programmatic` and `unknown/empty` as **separate** columns in `scripts/api_usage_report.py`. Never sum them into "agents".
- `/go/` hits count **redirect requests**, not visits or activations: link previews and bots trigger them. Name the field `redirect_requests` in the report. Do not use it as a conversion figure. A real "did the visitor do anything in the app" signal needs app-side data, which is a handoff item (see below); until that exists, say so in the report footer.

## Risks and unknowns

- [U] Whether Azure App Service puts the client IP first or last in `x-forwarded-for`, and whether it appends a port. This affects both the `ip_hash` and the existing rate limiter (see the IP-handling plan). Test against a deployed instance before trusting distinct-IP counts.
- [U] Whether Next 16 warns that `middleware.ts` is deprecated in favour of `proxy.ts`. Check the `npm run build` output. If so, rename in the same change and adjust `config.matcher`.
- The `usage` counters are per-container and reset on restart. Do not present them as totals.
- Log retention on Azure App Service is limited. The weekly report step should be run and its output saved to a file; without that, history is lost.
- Nothing here measures page views. That is decision 2 and is deliberately not solved by adding a tracker.

## Related

- `docs/pro-metrics-spec.md` (the pattern this copies), `docs/security-backlog.md` items 7 and 8, `docs/review/README.md` (index, when written).

## Scope note and handoff to `~/git/helloai-marketplace`

Scope clarification (relayed by Fable from cmc, 2026-09-25, not heard directly by this session; pending cmc's confirmation): this repo's review covers **helloai.com only**. app.helloai.com is a reference for decisions, and any change to it belongs to `~/git/helloai-marketplace`.

- **Stays here:** everything above, including the first-party `/go/` redirect, which is a helloai.com route.
- **Handoff, not a step of this plan:** any app-side reporting of activations (for example, the app recording a `?from=` or referrer value on signup or first job) so that a redirect request can be matched to what happened next. Suggested note for that repo: accept an optional `from` value carried from helloai.com's `/go/` redirect, record it with the first meaningful action, and expose an aggregate count only (no per-user data). Design and implementation belong to that repo's own conventions.
