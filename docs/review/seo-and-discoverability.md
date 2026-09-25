# Review: SEO and Discoverability, how agents see the site (track 7b)

Owner: Claude Fable 5.1 (hub session helloai-b9). Review room: `helloai-review`, 2026-09-25.
Related plans: `purpose.md` step 1 (Opus, owns the wrong COPY in `layout.tsx` metadata and `ai-plugin.json`; this plan owns STRUCTURE only),
`claims-guard.md` (Sonnet, guard test for copy), `graphics-and-look.md` step 1 (Fable, OG image 502 fix), `app-fit.md` (Opus, the app's MCP server and the concept page),
`observability.md` (Sonnet, goes first: without it nobody knows whether any agent or crawler arrives).

Tags: **[C]** confirmed by live request or code, **[U]** unverified, **[O]** opinion.

---

## 1. Problem

For search engines, the basics are in place and one thing is broken (share images, 502). For agents, the site offers exactly one discovery path, a 2023-era ChatGPT plugin manifest pointing at an OpenAPI file, and nothing an agent in 2026 looks for first: no `llms.txt`, no MCP manifest, no pointer to the app's MCP server. An agent that lands on helloai.com cannot find app.helloai.com at all.

## 2. Evidence

All requests made against the live site on 2026-09-25 at 16:00 UTC with `curl`.

### 2.1 What exists [C]

| URL | Status | Notes |
|---|---|---|
| `/robots.txt` | 200 | `Allow: /` for all, points at sitemap. From `app/robots.ts`. |
| `/sitemap.xml` | 200 | `/`, `/articles`, one entry per article. `/` and `/articles` get `lastmod` = build time. From `app/sitemap.ts`. |
| `/.well-known/ai-plugin.json` | 200 | `schema_version: v1`, `auth: none`, `api.url` → `/api/openapi.json`, `logo_url` → `/favicon.ico`. |
| `/api/openapi.json` | 200 | OpenAPI 3.0, version tied to app version (2.14.64). |
| `/api/status` | 200 | Version, freshness, rate limit, endpoint list, terms of use. |
| `/favicon.ico`, `/icon.svg` | 200 | 2 KB `.ico` (32 px) and a 371-byte SVG speech bubble. |
| `/concepts/agent-social` | 200 | `robots: noindex, nofollow` in its metadata. Not in the sitemap (correct, given noindex). |

Home `<head>` [C]: title (56 chars), description, canonical, `og:*` complete including image dimensions and alt, `twitter:card summary_large_image`, `twitter:creator @helloaix`, JSON-LD `WebSite` with `Person` author. Article pages add JSON-LD `Article` (`headline`, `description`, `datePublished`, `dateModified`, `mainEntityOfPage`, `author` Person, `publisher` Organization) and `og:type article` with `publishedTime`.

Security headers (`next.config.mjs`): HSTS with preload, CSP, `X-Frame-Options DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. `poweredByHeader: false`. Good for trust signals.

Model names, descriptions and prices are in the SSR HTML (`grep 'Claude Fable 5.1' home.html` hits), so crawlers that do not run JS see content.

### 2.2 What is missing or wrong [C]

1. **OG images 502.** `og:image` and `twitter:image` on every page point at a URL that returns 502. Root cause and tested fix are in `graphics-and-look.md` §2.1 and step 1. Effect here: no share preview anywhere, and Google's `max-image-preview:large` directive has nothing to show.
2. **`/llms.txt` 404, `/llms-full.txt` 404.** The llms.txt convention (llmstxt.org) is what agentic browsers and LLM crawlers fetch first in 2026. Nothing there.
3. **`/.well-known/mcp.json` 404, and no MCP anywhere on helloai.com.** The only MCP server in the family is on app.helloai.com (`/api/v1/mcp`, per `app-fit.md`). helloai.com does not mention it in `ai-plugin.json`, `/api/status`, OpenAPI, or HTML. An agent on helloai.com has no route to the app. The marketplace's own deployment plan asked for this pointer (I01 item 2, per Opus) and it is not done.
4. **`ai-plugin.json` is a retired format.** `schema_version: v1` is the ChatGPT plugin manifest; OpenAI retired plugins in 2024. Nothing mainstream reads it. It also names GPT (untracked) in `description_for_model` (copy fix owned by `purpose.md` step 1) and uses a 2 KB `.ico` as `logo_url`.
5. **JSON-LD gaps.** No `Organization` on the home page (the article `publisher` has no `logo`, so Google's article rich result requirement is unmet). `dateModified` always equals `datePublished`. No `image` on `Article`. No `ItemList` for the ranking, no `Dataset` or `WebAPI` for the API.
6. **Metadata copy names untracked things.** Description: "Claude, Gemini, GPT, Grok". OG description: "real benchmarks". Owned by `purpose.md` step 1; guard by `claims-guard.md`. Listed here for completeness only.
7. **API JSON has no `X-Robots-Tag`.** `/api/models` etc. are indexable as documents. Minor; agents want them, search engines do not.
8. **Sitemap `lastmod` for `/` is build time**, not `site.json → lastUpdated`. Harmless but imprecise; the data date is the honest one.

### 2.3 What the site tells an arriving agent today [C]

Sequence an agent following conventions would take: `robots.txt` (fine) → `sitemap.xml` (pages only, no API) → `llms.txt` (404) → `/.well-known/ai-plugin.json` (works, legacy) → `/api/openapi.json` (works, good). Only the last two carry any machine-usable description, and both say nothing about the app, MCP, rate limits (`/api/status` does), or what `score` means (`scoring-transparency.md`).

**[U]** Whether any agent has ever walked this path: no request logging for normal calls (`observability.md`), and my read-only log pull was not attempted.

## 3. Decisions needed (cmc)

**Adopted 2026-09-25 by cmc as recommended** (README "Decisions taken"): S1 keep `ai-plugin.json` with its text fixed; S2 point at the app's MCP (after step 3.0 confirms a working public URL); S3 follows A3, the concept page is deleted with a permanent redirect.

- **S1. `ai-plugin.json`: keep (with fixed copy), or delete and rely on `llms.txt` + OpenAPI?** Recommend keep for now, copy fixed (it costs nothing and some agent frameworks still probe it), and revisit once `observability.md` shows whether it is ever fetched.
- **S2. MCP on helloai.com: point at the app's server, or expose the directory's own?** Recommend point (a `mcp.json` that lists app.helloai.com's server plus a note that the directory is HTTP/OpenAPI). Exposing a second MCP server duplicates infra for six models' worth of data; `app-fit.md` I01(3) (the app reads `/api/models`) is the better data link.
- **S3. Is `/concepts/agent-social` staying?** `app-fit.md` says it duplicates the live app homepage. If it goes, `app-fit.md` step 1 adds the permanent redirect (`permanent: true` in `next.config.mjs` `redirects()`, which Next serves as a 308); if it stays, keep it noindex. Not duplicated here.

## 4. Implementation plan

### Step 1. Ship the OG fix (blocks everything visible in social)

Do `graphics-and-look.md` step 1. Nothing else in this plan changes what a human sees in a share card.

### Step 2. `llms.txt` and `llms-full.txt`

1. Add `app/llms.txt/route.ts` (a GET route, `Content-Type: text/plain; charset=utf-8`, `Cache-Control: public, max-age=3600`) that renders from data, never a static file, so it cannot drift:
   ```
   # Hello, AI
   > Curated directory of frontier AI models with LMArena Elo, list prices and context windows, plus task-specific recommendations. Updated weekly (<site.json lastUpdated>).

   ## API (no auth, 100 req/min/IP)
   - [OpenAPI spec](https://helloai.com/api/openapi.json)
   - [Status and freshness](https://helloai.com/api/status)
   - [All models](https://helloai.com/api/models)
   - [Recommend](https://helloai.com/api/recommend?task=coding): params task, max_cost, min_context, provider, limit. `score` is relative to the filtered set.

   ## Methodology
   - [How the ranking works](https://helloai.com/methodology)   <- once purpose.md step 2 ships; omit the line until then

   ## Models tracked
   - <one line per model: name, provider, elo, in/out price, context, url>

   ## Articles
   - <title>: <url> (<date>)

   ## Related
   - [HelloAI Marketplace (agents hire agents)](https://app.helloai.com), MCP server at https://app.helloai.com/api/v1/mcp
   ```
2. `llms-full.txt`: same header, then every article's full `content` paragraphs. Generate from `getArticles()`.
3. Add both to `app/sitemap.ts`? No: llms.txt is not a page. Do add `# llms: https://helloai.com/llms.txt` as a comment line in `robots.ts`? `MetadataRoute.Robots` has no comment field; skip, and rely on the convention path.
4. Test: `__tests__/llms-txt.test.ts` calls the route handler and asserts every model name from `models.json` and every article slug appears, and that the file mentions `app.helloai.com`.

Files: `app/llms.txt/route.ts` (new), `app/llms-full.txt/route.ts` (new), `__tests__/llms-txt.test.ts` (new), `data/index.ts` (a `getLlmsTxt()` helper if the route grows).

### Step 3. MCP pointer (S2)

0. **Verify the live MCP URL first; do not hardcode from docs.** The app repo names two URLs (`/api/v1/mcp` in `packages/helloai-mcp/README.md`, `POST /mcp` in `plan-cross-vendor-collaboration.md`, per `app-fit.md`). Probed on 2026-09-25 **[C]**: `GET https://app.helloai.com/api/v1/mcp` → 405, `POST` with an MCP `initialize` body → 404; `https://app.helloai.com/mcp` → 404 both ways; `/.well-known/mcp.json` → 404. A Claude Code connector in this session used `https://app.helloai.com/api/v1/mcp/t/<token>`, so the server appears to be **tenant-scoped behind a per-user token**; there is no anonymous endpoint to advertise. Worse, that tenant URL also failed at session start for two separate claude.ai connectors (Fable's and Opus's sessions, same day): `405, SdkHttpError, CLIENT_HTTP_NOT_IMPLEMENTED`. **[U]** whether it works from Claude Code's `claude mcp add --transport http` path, which is what the app README documents. That is an app-side bug for cmc (`app-fit.md` step 4), separate from discovery, and it must be fixed before any pointer from helloai.com is worth publishing. Until the app publishes a public discovery URL, `mcp.json` should point at a human/agent-readable page that explains how to obtain a tenant URL, not at the bare endpoint. **Scope (cmc, 2026-09-25): this repo's review covers helloai.com only; app.helloai.com is a reference for decisions, and any work on it belongs in `~/git/helloai-marketplace`.** So this step on the helloai.com side is: publish `mcp.json` only once the app exposes a public discovery URL, and until then omit the `servers` entry and keep the `http_api` block. The app-side items (a public MCP discovery page, and the connector 405 bug) are handed off as a note for the marketplace repo, not planned here.
1. Add `public/.well-known/mcp.json` (URL below is a placeholder until step 0 is resolved):
   ```json
   {
     "servers": [
       { "name": "helloai-marketplace", "url": "https://app.helloai.com/api/v1/mcp", "transport": "streamable-http",
         "description": "HelloAI Marketplace: post, claim and deliver agent jobs." }
     ],
     "http_api": { "openapi": "https://helloai.com/api/openapi.json", "llms_txt": "https://helloai.com/llms.txt" }
   }
   ```
   There is no ratified `.well-known/mcp.json` standard yet **[U, as of my knowledge]**; keep the shape minimal and say so in a `"_note"` field.
2. Add a `related` array to `/api/status` (`app/api/status/route.ts`) with the same two links, and an `externalDocs` entry in `/api/openapi.json` pointing at `llms.txt`.
3. `ai-plugin.json` (S1): after `purpose.md` step 1 fixes its text, add `"mcp_url"` and `"llms_txt_url"` custom fields. Harmless to legacy readers.
4. Test: extend `__tests__/openapi-consistency` (exists) so `/api/status.related` and `mcp.json` URLs are the same strings.

Files: `public/.well-known/mcp.json` (new), `app/api/status/route.ts`, `app/api/openapi.json/route.ts`, `public/.well-known/ai-plugin.json`, `__tests__/`.

### Step 4. Structured data

1. `app/layout.tsx`: add an `Organization` node (`name`, `url`, `logo` → an absolute PNG URL; `public/helloai.png` exists at 168 KB, check its dimensions ≥ 112 px) and reference it from `WebSite.publisher`. Use `@graph` to hold both.
2. `app/articles/[slug]/page.tsx`: `publisher.logo` → same URL; `image` → the article OG URL (valid once step 1 ships); `dateModified` → a new optional `updated` field on the article if present, else `date`.
3. `app/page.tsx` is `'use client'`, so put an `ItemList` of the six models (`position`, `name`, `url`) into `app/layout.tsx` only if it can be built server-side; otherwise skip. **[O]** Low value; Google rarely renders list rich results for this kind of page.
4. Validate with Google's Rich Results Test on the deployed pages; record the result in this doc.

Files: `app/layout.tsx`, `app/articles/[slug]/page.tsx`, `data/types.ts` (optional `updated`).

### Step 5. Small fixes

1. `app/sitemap.ts`: `lastModified` for `/` = `new Date(getSiteConfig().lastUpdated)`.
2. `middleware.ts` (or `proxy.ts` after Sonnet's rename): add `X-Robots-Tag: noindex` to `/api/*` responses. Keep `Allow: /` in robots so agents are never blocked.
3. If S3 removes the concept page, the redirect is owned by `app-fit.md` step 1 (308 via `permanent: true`). After it ships, confirm `curl -sI https://helloai.com/concepts/agent-social | head -1` shows 308 and that the sitemap still omits the path.

Files: `app/sitemap.ts`, `middleware.ts`.

## 5. Acceptance checks

- `curl -s https://helloai.com/llms.txt | grep -c "helloai.com/api"` ≥ 4, and every model name in `models.json` appears.
- `curl -s https://helloai.com/.well-known/mcp.json | jq .servers[0].url` returns the URL confirmed in step 3.0, and a `POST` initialize (or a GET of the docs page, if tenant-scoped) to that URL does not return 404.
- `curl -s https://helloai.com/api/status | jq .related` lists the same URLs.
- Rich Results Test on `/` shows `Organization` with logo; on an article, `Article` with `image` and `publisher.logo`, no errors.
- `curl -sI https://helloai.com/api/models | grep -i x-robots-tag` present; `curl -sI https://helloai.com/ | grep -i x-robots-tag` absent.
- Share preview renders on X and Slack (from `graphics-and-look.md` step 1).
- `seo-auditor` agent run after deploy passes; extend its checklist with llms.txt, mcp.json and the OG status code.

## 6. Not checked

- Google Search Console or Bing Webmaster status (no access from this session).
- Whether any agent or crawler has ever fetched `ai-plugin.json` or `openapi.json` (needs `observability.md`).
- app.helloai.com's own SEO and its MCP server behaviour (my session's connector to it failed with a 405; `app-fit.md` covers the app).
- Article page rendering beyond `<head>`; the article index page was screenshotted and looks consistent with the home design.
