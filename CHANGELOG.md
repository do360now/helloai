# Changelog — helloai.com

Consolidated security-remediation history, previously tracked in five
root-level reports (REQUIREMENTS.md, RISK_ANALYSIS.md, SOLUTIONS.md,
SECURITY_FINDINGS.md, SECURITY_P0_REMEDIATION.md), now deleted. Every entry
below was verified against the codebase, production (v2.14.42), and live DNS
on 2026-07-04. Still-open items are tracked privately.

**Note on IDs:** two generations of reports used overlapping `SOL-` numbers.
"original SOL-00x" = SOLUTIONS.md (2026-04-19 threat model). "red-team
SOL-00x" = SECURITY_P0_REMEDIATION.md (2026-06-30 red-team runbook). They
are different sets.

## 2026-07-04 — validation parity + CORS/cache hardening

- Strict shared query validation `parseRecommendParams()` in `lib/api.ts`,
  used by both `/api/recommend` and `/api/pro/recommend` so the two
  contracts cannot drift. Invalid input → 400.
- `provider` validated against providers derived from `models.json`; invalid
  values → 400 with `valid_providers` list. Closes REQ-005 / original
  SOL-005.
- `limit` strictly an integer 1–10; `max_cost`/`min_context` must be
  full-string numeric (no `parseInt` prefix-parsing). Closes REQ-006.
- `task` sanitization extracted to `lib/sanitize.ts` (`sanitizeTask`):
  strips `<>"'&` + control chars, caps at 64 chars, empty-after-sanitize
  treated as absent.
- CORS restricted: `lib/cors.ts` now echoes only allowlisted browser origins
  (helloai.com, www, localhost dev ports) with `Vary: Origin`. Supersedes
  the "open CORS accepted" posture from the 2026-05-22 review. Closes
  REQ-002 / original SOL-003. Non-browser clients (agents, curl) are
  unaffected — the API remains public and unauthenticated by design.
- Cache-key safety: any parameterized request gets
  `Cache-Control: private, no-store`; bare endpoints stay publicly cacheable
  (`s-maxage=300`), decided from the whole query string so new params can
  never silently reopen shared caching.

## 2026-07-01 — red-team P0 deployment (transport + header hardening)

From the 2026-06-30 red-team runbook (red-team SOL-001/002/005/006/007),
confirmed live in production on 2026-07-04:

- HSTS: `max-age=63072000; includeSubDomains; preload`.
- CSP: `default-src 'self'`; `frame-ancestors 'none'`; `object-src 'none'`;
  `base-uri 'self'`; `form-action 'self'`; `upgrade-insecure-requests`.
  `script-src`/`style-src` retain `'unsafe-inline'` (Next.js App Router +
  Tailwind inline chunks) — nonce-based CSP is a P2 backlog item.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  lockdown (camera/mic/geolocation off).
- `poweredByHeader: false` — `x-powered-by` no longer emitted.
- Framework-level HTTP→HTTPS 301 via `next.config.mjs` `redirects()`
  (belt-and-braces; Azure "HTTPS Only" toggle is the primary control).
- Reflected `task` input sanitized: `?task=<script>x</script>` →
  `"scriptx/script"` in the JSON body.
- SPF hardened to hard-fail: `v=spf1 a mx
  include:server268.smtp-spf.sureserver.com -all` — verified in DNS
  (red-team SOL-003 step 1; DKIM + DMARC remain open, see backlog).

## 2026-05-22 — security review (Claude Code, Opus 4.7)

- **H-001 (no rate limiting): confirmed RESOLVED** — per-IP limiter live in
  `middleware.ts` (see 2026-05-11 entry).
- **New finding, fixed same day:** anomaly detection was inert —
  `detectAnomalousPattern(ip)` ran but `logRequest()` was never called, so
  `requestHistory` was always empty and no heuristic could fire. Fix:
  middleware now logs every `/api/` request (timestamp, ip, userAgent,
  endpoint, params) immediately before detection.
- **M-001 (open CORS): accepted by design** at the time — superseded
  2026-07-04 by the origin allowlist.
- **M-002 (no auth): accepted by design** — public read-only API, no user
  data; rate limiting is the abuse control.
- **L-001 (`dangerouslySetInnerHTML` in `app/layout.tsx`): not
  exploitable** — static `JSON.stringify` JSON-LD, no user input; standard
  Next.js pattern.
- Positive findings: no hardcoded secrets, no `eval`/`exec`/`spawn`,
  TypeScript strict, numeric param validation, `limit` capped 1–10.

## 2026-05-11 — initial security implementation (repo first commit)

Implemented the P0/P1 solutions from the 2026-04-19 threat model:

- **REQ-001 / original SOL-001 — rate limiting** (`middleware.ts`): per-IP
  sliding window, 100 req/min, 429 + `Retry-After`, `X-RateLimit-Limit/
  Remaining/Reset` headers on all API responses. In-memory `Map` with
  60-second cleanup — appropriate for the single-container deployment;
  migrate to Redis/Upstash if ever scaled to replicas.
- **REQ-004 / REQ-M2 / original SOL-002 — AI reconnaissance detection**
  (`lib/request-logger.ts` + middleware): AI user-agent flagging, plus
  heuristics for high-frequency probing (>20 req/min), sequential endpoint
  probing (≥5 unique endpoints), and parameter fuzzing — all emitting
  structured `console.warn` JSON alerts to container logs.
- **REQ-003 / original SOL-004 — API usage documentation**: `/api/status`
  exposes `rate_limit` ({limit: 100, window: "1 minute", by: "IP address"})
  and `terms_of_use` (allowed/prohibited usage).

## 2026-04-19 — threat model (agent-generated)

REQUIREMENTS.md, RISK_ANALYSIS.md, and SOLUTIONS.md produced by a local
agent pipeline (qwen2.5 + devstral). Identified 7 risks — headline: API DoS
(no rate limiting), data scraping, cost abuse, AI-driven autonomous
reconnaissance — and 8 requirements (REQ-001…006, REQ-M1/M2). Every
requirement is now implemented except REQ-M1 (CI/CD for <24h patch
velocity), which is accepted-as-manual.
