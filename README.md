# Hello, AI

An unbiased, curated directory of frontier AI models — with Elo rankings, category insights, weekly articles, and a public API for both humans and agents.

**Live**: [helloai.com](https://helloai.com)

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-cyan)

## Features

- **Interactive directory**: Filter and rank models by task, cost, and context window — live on the homepage
- **Leaderboard**: Elo ratings from Chatbot Arena blind votes, updated weekly
- **Category insights**: Which model leads for coding, reasoning, daily use, and more
- **Weekly articles**: Honest editorial — no hype, no affiliate links
- **Public API**: Machine-readable endpoints for developers and AI agents
- **SEO**: Dynamic OG images per page, sitemap, robots.txt, canonical URLs, Article JSON-LD
- **Claude agents**: Automated maintenance agents for data validation, SEO auditing, article scouting, and leaderboard freshness

## API

All endpoints are public. No auth required. CORS open.

```
GET /api/status                              # Health, version, data freshness
GET /api/models                              # All models with full data
GET /api/models?provider=Google              # Filter by provider
GET /api/recommend?task=coding               # Task-based recommendation
GET /api/recommend?task=reasoning&max_cost=10&min_context=1000000
GET /api/openapi.json                        # Full OpenAPI 3.0 spec
GET /.well-known/ai-plugin.json              # Agent discovery manifest
```

### /api/recommend parameters

| Param | Type | Description |
|-------|------|-------------|
| `task` | string | Use case: `coding`, `reasoning`, `daily`, `overall` |
| `max_cost` | number | Max USD per 1M input tokens |
| `min_context` | number | Min context window in tokens |
| `provider` | string | Filter by provider (case-insensitive) |
| `limit` | integer | Results to return (1–10, default 3) |

### Agent queryability

AI agents can self-discover and use the API without human configuration:

1. Fetch `https://helloai.com/.well-known/ai-plugin.json`
2. Read the full schema at `https://helloai.com/api/openapi.json`
3. Call `/api/recommend` with task-specific parameters autonomously

## Development

```bash
npm install
npm run dev          # Dev server → localhost:3000
npx jest             # Data integrity tests
npx tsc --noEmit     # TypeScript check
npm run build        # Production build
```

## Deployment

```bash
make bump_version          # Bump patch version (always run separately)
make build_helloai_image   # Build Docker image (injects APP_VERSION)
make push_helloai_image    # Push to Docker Hub
make az_deploy             # Update Azure container + restart
```

Full pipeline: `make deploy`

## Project structure

```
data/
  models.json          # Models: elo, cost, context_window, strengths
  categories.json      # Use-case categories with leaders
  articles.json        # Articles sorted by date desc
  site.json            # Config + lastUpdated
  index.ts             # Data access functions
  recommend.ts         # Shared scoring logic (API + UI)
  types.ts             # TypeScript interfaces
app/
  page.tsx             # Homepage with interactive model filter
  articles/
    page.tsx           # /articles listing
    [slug]/page.tsx    # Individual articles (async params)
  api/
    models/route.ts
    recommend/route.ts
    status/route.ts
    openapi.json/route.ts
  components/          # React components
  opengraph-image.tsx  # Dynamic OG image — homepage
  sitemap.ts           # Auto-generated /sitemap.xml
  robots.ts            # Auto-generated /robots.txt
public/
  .well-known/
    ai-plugin.json     # Agent discovery manifest
.claude/
  skills/
    deploy.md                  # Deploy workflow
    advisor-pattern.md         # Executor+Advisor pattern reference
  agents/
    article-writer.md          # Sonnet (advisor: Opus) — writes article prose
    article-idea-generator.md  # Sonnet (advisor: Opus) — weekly editorial scouting
    api-smoke-tester.md        # Haiku (advisor: Sonnet) — post-deploy API validation
    data-validator.md          # Haiku (advisor: Sonnet) — data integrity + semantic drift
    leaderboard-updater.md     # Sonnet (advisor: Opus) — model version/pricing freshness
    seo-auditor.md             # Sonnet (advisor: Opus) — live page SEO health check
  agent-memory/
    leaderboard-updater.md     # Staleness streaks, candidate verdicts (cross-session)
    article-idea-generator.md  # Brief queue, recurring gaps (cross-session)
  hooks/
    post-edit.sh               # Post-edit ESLint guardrail
__tests__/                     # Data integrity tests
scripts/                       # Python automation scripts
verify-all-agents.sh           # Verify agent frontmatter integrity hashes
```

## Data update workflow

1. Edit `/data/*.json`
2. Update `site.json → lastUpdated` to today's date
3. `npx jest` — validate structure
4. `npx tsc --noEmit` — typecheck
5. Run `/agent data-validator` — catch semantic drift and cross-reference errors
6. `./verify-all-agents.sh` — verify agent integrity hashes
7. Deploy via Makefile

## Maintenance agents

Run these via Claude Code (`/agent <name>`):

| Agent | Executor | Advisor | When to run | What it does |
|-------|----------|---------|-------------|--------------|
| `data-validator` | Haiku | Sonnet | After any data change | Structural + semantic checks on all `data/*.json` |
| `api-smoke-tester` | Haiku | Sonnet | After every deploy | Validates all 7 API endpoints are healthy |
| `leaderboard-updater` | Sonnet | Opus | Weekly | Detects stale model versions, pricing, arena name map drift; tracks staleness streaks across runs |
| `article-idea-generator` | Sonnet | Opus | Weekly | Scouts AI news, returns 5 prioritized article briefs; maintains brief queue across runs |
| `seo-auditor` | Sonnet | Opus | Before major deploys | Audits live pages for title, OG, canonical, structured data |
| `article-writer` | Sonnet | Opus | On demand | Writes polished article prose (pass a brief, get JSON content array) |

All agents use a **generator-verifier pattern**: the executor does the work, the advisor is consulted at explicit decision points with concrete, testable criteria — prompted with "Think carefully and step-by-step" to leverage Opus 4.7 adaptive thinking. Weekly agents (`leaderboard-updater`, `article-idea-generator`) persist state between runs via `.claude/agent-memory/`. Each agent's frontmatter includes an `integrity-hash-sha256` field; run `./verify-all-agents.sh` to confirm no agent file has been tampered with.

## Stack

- **Framework**: Next.js 16.1.6 (App Router, standalone Docker output)
- **Language**: TypeScript strict
- **UI**: React 19, Tailwind CSS v4
- **Hosting**: Azure Web App (Docker)
- **Registry**: Docker Hub `do360now/helloai-web`

---

Curated by [Clement Machado](https://clementmachado.com) · [@MachadoClement](https://x.com/MachadoClement) · No ads, no affiliate links
