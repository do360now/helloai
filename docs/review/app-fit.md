# Review: Fit with app.helloai.com (track 2)

Owner: Opus 5.5 (hub session helloai-2a). Review room: `helloai-review`, 2026-09-25.
Related: `purpose.md` (D1 decides which site is the front door), `observability.md` (Sonnet: outbound-click
counting via `/go/`), `seo-and-discoverability.md` (Fable: llms.txt / manifest pointers), `monetisation.md` (7e).

Tags: **[C]** confirmed by reading code in the named repo or a live request, **[U]** unverified, **[O]** opinion.
Two repos are involved:
- **directory**: `~/git/grok/helloai` → helloai.com (this repo)
- **app**: `~/git/helloai-marketplace` → app.helloai.com ("HelloAI Marketplace: Where Agents Hire Agents")

---

**Scope (2026-09-25, cmc via Fable, relayed; pending cmc's direct confirmation):** this repo plans helloai.com changes only.
app.helloai.com is a *reference* for decisions. Any work in `~/git/helloai-marketplace` is listed under "Handoff" and isn't a step here.

## 1. Problem

The two sites share a name, a logo and an animation, but **no data and no user journey**. helloai.com's hero promises
"Find the right AI. Introduce it to another." Nothing connects "find" (directory) to "introduce" (app). The app's own
integration plan (I01) lists that link as the next step, and it hasn't been built.

## 2. Evidence

### 2.1 What the app is [C]
- A separate Next.js 14 monorepo: job lifecycle (post, claim, lease, deliver, independent verification, mock
  settlement), Postgres, shared rooms for people and agents, and an MCP server (`/api/v1/mcp`; `packages/helloai-mcp/README.md`).
  Live on app.helloai.com with mock payments since 2026-09-14 (app `README.md`).
- Live homepage `<title>`: "HelloAI — It starts with hello."; description: "Bring people and AI agents into one shared
  conversation…" (fetched 2026-09-25, HTTP 200).

### 2.2 Duplicated UI [C]
- `app/concepts/agent-social/page.tsx` (directory) is the design preview of the app's welcome page. The app now ships
  the same copy ("It starts with hello.", the same 3 steps, the same "Explore the job marketplace" link). The directory copy
  is `noindex`, labelled "DESIGN PREVIEW", and now stale.
- `AgentSocial.tsx` is identical in both repos (`app/components/AgentSocial.tsx` here, `apps/web/components/AgentSocial.tsx`
  in the app; 125 lines each, whitespace-stripped diff is empty). Its CSS is copied too (`app/globals.css` "Companion
  welcome concept" block here, `apps/web/app/agent-social.css` there). This is copy-paste with no shared package, so the copies will drift.

### 2.3 The planned integration (I01) is mostly not built [C]
App repo `docs/implementation/deployment-plan-2026-09-14.md` §6:

| I01 item | Owner repo | Status 2026-09-25 |
|---|---|---|
| Navigation from helloai.com to app.helloai.com | directory | **Partial.** Two hero links in `app/components/Hero.tsx`. Not in `Nav.tsx`, not in the footer. |
| Pointer in the agent-discovery manifest | directory | **Not done.** `public/.well-known/ai-plugin.json` doesn't mention the app or its MCP. No `llms.txt`. |
| Read-only cached adapter over `https://helloai.com/api/models` | app | **Not found.** No reference to helloai.com's API in `apps/web/lib`, `apps/web/app` or `packages/db/src`. |
| I02 decision record "separate apps under one product" | app | **Not found** as its own document (mentioned only in the plan). |

- The app records which model did a job only as free text: `DeliverSchema.model_identity: z.string().max(200).optional()`
  (`packages/db/src/schemas.ts`). It isn't linked to a directory model `id`. **[C]**

### 2.4 Two independent Lightning paywalls [C]
- Directory: `/api/pro/recommend` plus `lib/pay/*`, a custom 402 + `X-Preimage` header, an HMAC-signed JSONL ledger, and mock backend only
  (`docs/pay-loop.md`).
- App: fee accounting, an L402 direct-task endpoint, and an LNbits/Phoenixd/Voltage stack (app `docs/implementation/revenue-roadmap-2026-09-15.md`,
  `plan-l402-direct-endpoint.md`).
- These are two payment protocols, two ledgers and two sets of Lightning plumbing under one brand. Covered in `monetisation.md`.
- Signing key: `lib/pay/config.ts:20` defaults to `dev-insecure-key-change-me`, but lines 37–45 throw when the backend is
  non-mock and the key is unset. `__tests__/pay/config.test.ts` covers this **[C, Sonnet]**. So the default can only be live in mock mode.
  See `client-ip-and-rate-limit.md` "Related check".

### 2.5 How the app's plans use the directory [C]
- The app's launch plan (`plan-launch-capacity-and-campaign.md`) treats helloai.com as the **articles channel**: three
  launch articles in `data/articles.json` and an invite-request page on helloai.com.
- So the app's plans already count on the directory for reach. There's no measurement of whether it delivers any
  (`observability.md`: no page analytics, no outbound-click count).

### 2.6 Funnel measurement [C]
None. See `observability.md` step 5 (first-party `/go/[dest]` redirect with a fixed allow-list). Everything in §4 depends on it.

## 3. Decisions needed (cmc)

**Status: adopted 2026-09-25.** Relayed by Fable (hub session b9) in `helloai-review` as cmc's words: "Let's go with the recommendations already shown in the table." **cmc: please confirm directly; this was not given in the Opus session.**
- A1 → (a) separate apps, one product, with a real data link (directory ids as the shared key).
- A2 → keep both AgentSocial copies, with the drift check in step 6.
- A3 → delete `/concepts/agent-social`, with a 308 to the app.

The options and reasoning are kept below for the record.


**A1. Relationship model.** Choose one:
- **(a) Separate apps, one product, a real data link** (recommended). Directory = "which model/agent", app = "put it to
  work". The directory's model ids become the vocabulary the app uses for `model_identity`, and recommendation results link
  into the app. This matches the app's own I02 wording.
- (b) Merge the directory into the app (app.helloai.com/models). This ends the duplication, but loses the directory's
  simple static hosting and SEO history. Not recommended while the app is in mock-payment beta.
- (c) Keep them loosely linked (today's state). Then drop "Introduce it to another" from the directory hero, since nothing delivers on it.

**A2. Where does AgentSocial live?** Revised after Fable's challenge: the scene is the directory's only artwork and stays as its
hero visual (`purpose.md` step 5, `graphics-and-look.md` step 2), and the app uses it as its welcome too. Recommended: **keep two
copies, and make the drift visible** (step 6). A shared package isn't worth it for 125 lines.

**A3. Delete `/concepts/agent-social`?** Recommended: yes, replace it with a permanent redirect to `https://app.helloai.com`.

## 4. Implementation plan

### Step 1: Remove the stale duplicate (directory, no dependency)
- Delete `app/concepts/agent-social/page.tsx`. Add a redirect in `next.config.mjs`:
  `{ source: '/concepts/agent-social', destination: 'https://app.helloai.com', permanent: true }`.
- Remove the "Companion welcome concept" CSS block from `app/globals.css`, but only the `social-app-*` selectors that nothing
  else uses (`grep -rn "social-app-" app` must return nothing after the change).
- Check: `curl -sI https://helloai.com/concepts/agent-social` returns 308 to the app.

### Step 2: Finish I01 items 1 and 2 (directory)
- `app/components/Nav.tsx`: add one external link "App ↗" → the `/go/app` route from `observability.md` step 5 (or
  `https://app.helloai.com` directly if that route isn't built yet). Add the same link to `Footer` in `app/page.tsx`.
- Agent discovery (I01 item 2) is **owned by `seo-and-discoverability.md`** (`.well-known/mcp.json`, `llms.txt`, `/api/status`
  `related` links, `ai-plugin.json` `mcp_url`). Don't edit those files from this plan.
  **Open point for that plan:** the app repo shows two MCP URLs, `https://app.helloai.com/api/v1/mcp` (`packages/helloai-mcp/README.md`)
  and `POST https://app.helloai.com/mcp` (`docs/implementation/plan-cross-vendor-collaboration.md`). Verify which one is live before publishing it.
- Check: `/api/status` and `/.well-known/ai-plugin.json` both mention app.helloai.com. Run `npx jest` (openapi-consistency, api-routes).

### Step 3: Make the directory's model ids the shared vocabulary (directory side)
- Document in `app/api/openapi.json/route.ts` that `Model.id` is **stable** and meant for use as a foreign key by other
  services. Add a jest test in `__tests__/data.test.ts` that pins the current ids, so renaming one is a deliberate act.
- Add `GET /api/models/{id}` (single model). This is the fetch the app's adapter needs. Reuse `getModels()` and return 404 for an unknown id.
  Add it to OpenAPI and to `__tests__/openapi-consistency.test.ts`.

### Step 4: (moved) The app-side adapter is a handoff. See "Handoff to ~/git/helloai-marketplace" below.

### Step 5: One link from recommendation to action (after A1 = a, step 3, and handoff H-A1 being live in the app)
- In the directory's recommendation results (`app/components/ModelFilter.tsx`) and in `/api/recommend` results, add
  `"try_in_app": "https://app.helloai.com/…?model=<id>"` **only once the app accepts that parameter**. Don't link to a
  URL the app ignores.
- This is the concrete meaning of "Find the right AI. Introduce it to another." Until it exists, `purpose.md` step 5
  should drop or soften that line.

### Step 6: Keep the two AgentSocial copies honest (after A2)
- Add a header comment to **this repo's** `app/components/AgentSocial.tsx`: "Also copied in ~/git/helloai-marketplace/apps/web/components/AgentSocial.tsx.
  Change both, or note the divergence here." (The matching comment in the app's copy is handoff H-A3.)
- Record the current identical state in this doc: 125 lines each, and a whitespace-stripped diff that was empty on 2026-09-25. Re-check with
  `diff <(tr -d '[:space:]' < app/components/AgentSocial.tsx) <(tr -d '[:space:]' < ~/git/helloai-marketplace/apps/web/components/AgentSocial.tsx)`.
- If they diverge on purpose, delete the comment in the one that changed and say why in its commit.

## 4b. Handoff to `~/git/helloai-marketplace` (out of scope for this repo)
For a session working in the app repo, under that repo's own conventions (its `CLAUDE.md`, `docs/implementation/`). Listed so the
helloai.com steps above know what they're waiting for. Nothing here is planned or tracked by this review.

**H-A1. Cached adapter over helloai.com's model data** (unblocks step 5 above and `collaboration.md` Phase B):
- A cached (for example 1 h) server-side fetch of `https://helloai.com/api/models`, kept on failure with last-known data.
  Browser CORS on helloai.com doesn't matter because it's server to server.
- When a worker delivers `model_identity`, try to map it to a directory `id`. Store both. Show the directory name and a link to
  `https://helloai.com/#models` (or a model page if one is added later) on the job and on the agent profile.
- Reference I01 in the app's `docs/implementation/deployment-plan-2026-09-14.md` §6.
- Also accept `?model=<directory id>` on a job-post or room URL, so helloai.com step 5 has something to link to.

**H-A2. Public MCP discovery page, and the connector 405.** Live checks on 2026-09-25 (Fable): `app.helloai.com/api/v1/mcp` gives 405 on GET
  and 404 on POST initialize, `app.helloai.com/mcp` gives 404, and the app's `/.well-known/mcp.json` gives 404. The server appears to be tenant-scoped
  (`/api/v1/mcp/t/<token>`). **[C]** The tenant URL configured as a claude.ai connector in Opus's session also failed to connect
  at startup (405, `CLIENT_HTTP_NOT_IMPLEMENTED`). So even the per-user URL may be broken for claude.ai connectors. **[U]**
  whether it works from Claude Code's own MCP client. helloai.com can't advertise an MCP endpoint until the app publishes a public page
  explaining how to get a tenant URL (`seo-and-discoverability.md` step 3, step 0).


**H-A3. AgentSocial drift comment** in `apps/web/components/AgentSocial.tsx`, pointing back at this repo's copy (mirror of step 6).


- `/concepts/agent-social` redirects to the app, and there's no `social-app-` CSS left in `app/globals.css`.
- Nav and footer link to the app. After `observability.md` ships, the weekly report shows the outbound-click count for the app.
- No MCP URL is advertised from helloai.com until the app publishes a public discovery URL (`seo-and-discoverability.md` step 3.0).
- `GET /api/models/fable-5-1` (or whatever the actual id is) returns one model. An unknown id returns 404. It's in OpenAPI, and jest passes.
- Model ids are pinned by a test.
- `npx jest`, `npx tsc --noEmit`, `npm run build`.

## 6. Files touched (directory)
`app/concepts/agent-social/page.tsx` (deleted), `next.config.mjs`, `app/globals.css`, `app/components/Nav.tsx`,
`app/page.tsx` (Footer), `public/.well-known/ai-plugin.json`, `app/api/models/[id]/route.ts` (new),
`app/api/openapi.json/route.ts`, `__tests__/data.test.ts`, `__tests__/openapi-consistency.test.ts`, `__tests__/api-routes.test.ts`,
later `app/components/ModelFilter.tsx`, `app/components/Hero.tsx`.

## 7. Not checked
- Whether anyone clicks from helloai.com to the app (not measured anywhere).
- The app's own analytics or referrer logs (not looked at; the app has key-protected operator metrics per its launch plan).
- The app's MCP endpoint behaviour. The helloai MCP connector in this session failed to connect (405), so no live call was made.
- Whether `LEDGER_SIGNING_KEY` is set in helloai.com production (it only matters once the backend leaves mock).
