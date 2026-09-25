# Plan: correct client-IP handling and a rate limiter that can't be dodged or bloated (review track 7f)

**Author:** Sonnet 5 (helloai-7e), review room `helloai-review`, 2026-09-25
**Executor:** Sonnet from a cold session. **Status:** PLAN, nothing implemented.
**Related:** `docs/security-backlog.md` items 7 and 8, `docs/review/observability.md` (shares the IP helper).

## Problem

`middleware.ts:28` (the only place a client IP is read, checked with `grep -rn x-forwarded-for app lib middleware.ts`):

```ts
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
```

The IP feeds the 100/min rate limiter and the anomaly detector. Consequences, from reading the code:

1. **[U] Spoofable.** The first entry of `X-Forwarded-For` is whatever the client sent unless the proxy overwrites it. A caller who sends a different `X-Forwarded-For` on each request gets a fresh bucket each time and is never limited. Whether Azure App Service's front end overwrites or appends is **not verified**; it must be tested on a deployed instance (step 1).
2. **[U] Port suffix.** Azure App Service is documented to send `ip:port` in `X-Forwarded-For` for some paths. If so, the same client appears as different "IPs" per source port and never reaches the limit. Not verified.
3. **[C] Unbounded memory.** `rateLimitMap` gets one entry per distinct key and is only pruned when a window expires (once a minute). A caller that varies the header can add entries much faster than they expire. There is no size cap.
4. **[C] Shared `'unknown'` bucket.** Requests with no `X-Forwarded-For` all share one key, so any client without the header (health checks, local tools, some proxies) shares 100 requests/min with every other such client.
5. **[C] O(n) work per request.** `detectAnomalousPattern` filters the whole `requestHistory` array (up to 10,000 entries) on every `/api` request, and parses a `Date` for each matching entry. With traffic near the cap this is thousands of operations per request. Not a problem at today's likely volume (unmeasured, see observability plan), a cost if abused.
6. **[C] Alert noise.** `detectAnomalousPattern` flags more than 20 requests per minute per IP, and the rate limit allows 100. So the "anomaly" fires on ordinary permitted use and is only a log line.

## Decision needed from cmc

> **Decision status:** on 2026-09-25 the recommended option for each decision below was reported as adopted by cmc ("Let's go with the recommendations already shown in the table"). This was relayed by Fable from cmc's message in its own session; the Sonnet session has not received it from cmc directly. Treat as adopted, pending cmc's confirmation. See `README.md`, "Decisions taken". D4/D5-style texts that cmc must write are not drafted here.


1. How many trusted proxy hops sit in front of the container in production (Azure App Service front end only, or also a CDN/Front Door)? The plan makes this an env setting, `TRUSTED_PROXY_HOPS`, but someone must confirm the value from a real request.
2. Should over-limit callers get a longer block (for example 10 minutes after 3 violations) or is the current fixed window enough? Recommended: keep the fixed window until traffic data exists.

## Plan

### Step 0. Measure before changing (operator, 10 minutes)

After a deploy that includes the observability plan, or with a temporary log line, record the shape of `x-forwarded-for` on 20 requests from two known networks (home, phone data), and one request where the caller sends a fake `X-Forwarded-For: 203.0.113.9`. Record in this doc, under "Findings", whether (a) the fake value appears first, last, or not at all, and (b) whether a port is attached. **Do not implement step 2 until this is filled in.** Do not test rate-limit bypass against production traffic beyond a handful of requests.

### Step 1. `lib/client-ip.ts` (new, pure function)

```ts
export function getClientIp(headers: Headers, hops = Number(process.env.TRUSTED_PROXY_HOPS ?? '1')): string
```

- Split `x-forwarded-for` on commas and trim.
- Take the entry at index `length - hops` (the address the outermost trusted proxy saw), not index 0. If fewer entries than hops, use the first.
- Strip a trailing `:port` (IPv4 `a.b.c.d:1234`; bracketed IPv6 `[::1]:1234`).
- Validate with `net.isIP`. If invalid or missing, return `'unknown'`.
- Never trust `x-real-ip` unless step 0 shows the platform sets it.

### Step 2. Use it in `middleware.ts`

Replace line 28 with `getClientIp(request.headers)`. Keep behaviour for `'unknown'` (see step 3).

### Step 3. Bounded limiter

- Cap `rateLimitMap` at `MAX_TRACKED_IPS = 10_000`. When full and the key is new, evict expired entries first, then the oldest one.
- Requests with no valid IP go into per-user-agent-hash buckets instead of one shared `'unknown'` bucket. Simple form: key `unknown:${sha256(userAgent).slice(0, 8)}`. This keeps one anonymous tool from blocking all others.
- Move the limiter and its pruning into `lib/rate-limit.ts` with an injectable clock (`now()` parameter) so it can be unit-tested. Remove the module-level `setInterval` from `middleware.ts` and prune opportunistically on each call (delete a few expired entries per request), so no timer is needed.

### Step 4. Cheaper anomaly detection

In `lib/request-logger.ts`, replace the whole-array scan with a per-IP map of recent timestamps (array capped at 50 per IP, dropped when older than 60 seconds). `detectAnomalousPattern(ip)` then touches only that IP's entries. Raise the "high frequency" threshold from 20 to 60 per minute so it fires only when a caller is close to the rate limit. Keep the reason strings unchanged, because `__tests__` and log greps may depend on them (`grep -rn "High frequency" __tests__ scripts docs`).

## Tests (write first)

- `__tests__/client-ip.test.ts`: single IP; `client, proxy` with hops 1 and 2; `1.2.3.4:5678` → `1.2.3.4`; `[2001:db8::1]:443` → `2001:db8::1`; garbage (`abc`, empty, script text) → `'unknown'`; more hops than entries.
- `__tests__/rate-limit.test.ts` (fake clock): the 101st request in a window is blocked; window reset allows again; 20,000 distinct keys never grow the map past `MAX_TRACKED_IPS`; two different `unknown` user agents do not share a bucket.
- `__tests__/request-logger.test.ts`: existing behaviours (probing, fuzzing, high frequency at the new threshold) still detected; a quiet IP among 10,000 other entries is evaluated without scanning them (assert the per-IP structure, not timing).

## Acceptance checks

1. `npx jest`, `npx tsc --noEmit`, `npm run build` clean.
2. Local: `for i in $(seq 1 110); do curl -s -o /dev/null -w '%{http_code}\n' -H "X-Forwarded-For: 198.51.100.$i" localhost:3000/api/models; done | sort | uniq -c` with `TRUSTED_PROXY_HOPS=1` and a single fake entry → still all 200 (each is a distinct client behind one proxy hop **only if** the test proxy sets it; document why). With the same header repeated on 110 requests → 100 × 200 then 429.
3. The manual checks in `docs/security-backlog.md` ("RT-001", "RT-004") still pass.
4. Step 0 findings recorded below before step 2 ships.

## Findings (fill in during step 0)

- fake `X-Forwarded-For` appears: ___ (first / last / dropped)
- port attached: ___
- production `TRUSTED_PROXY_HOPS` value: ___

## Related check: pro-endpoint signing key (added after Opus's note)

- [C] `lib/pay/config.ts:20` defaults `ledgerSigningKey` to `dev-insecure-key-change-me`. The guard at `lib/pay/config.ts:37-45` **throws** when the Lightning backend is not mock and the key (or `ACCUMULATION_ADDRESS`) is unset or empty, and `__tests__/pay/config.test.ts` covers it. So the default can only be in effect in mock mode.
- Consequence today: while the paywall is mock-only, the HMAC ledger signature protects nothing real, and there is no money at risk. The risk starts the day `LN_BACKEND` is switched off mock; the guard is what stops that from happening with the default key.
- [U] Whether `LEDGER_SIGNING_KEY` is set in production. Operator check: `az webapp config appsettings list` (names only, do not print values). Set it before any non-mock switch, even though the guard would also catch it.
- Add to the acceptance checks of any future "go live with real Lightning" plan: rotate the key, confirm the guard test still passes, and confirm the ledger directory is on persistent storage (metrics and ledger files are lost when the container restarts, per `docs/pro-metrics-spec.md`).

## Files touched

New: `lib/client-ip.ts`, `lib/rate-limit.ts`, three test files. Edited: `middleware.ts`, `lib/request-logger.ts`, `docs/security-backlog.md` (close items 7 and 8 partially, add this plan's link).

## Risks

- Choosing the wrong `TRUSTED_PROXY_HOPS` either makes every request look like it comes from the proxy (one shared bucket, everyone gets limited) or leaves the spoof open. That is why step 0 comes first and why a test with a real deployed request is required.
- The rate limit stays per container. If the app scales out (security-backlog item 7), move the store to Redis/Upstash; this plan does not do that.
