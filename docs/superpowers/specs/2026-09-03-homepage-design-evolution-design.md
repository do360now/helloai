# Homepage Design Evolution — Design

**Date:** 2026-09-03
**Status:** Approved (design review + owner: implement as sequenced plans)
**Live surface:** https://helloai.com/
**Plans:** `docs/superpowers/plans/2026-09-03-homepage-design-evolution.md` (index) and `2026-09-03-homepage-0{1-6}-*.md`

## Goal

Evolve the homepage from a 2024 full-viewport AI splash into a 2026 editorial directory — without changing the brand (dark canvas, mint `#00E5A0`, per-model colors, curated six). The first viewport should show the week's models. Cards should show the numbers we already track. Ranking, insights, and articles should each do one job.

This is an evolution, not a restyle. Do not make it look like Linear, Vercel, LMArena, or a 200-row catalog.

## Out of scope (do not implement in this sequence)

- On-site model detail pages (`/models/[id]`). Deferred follow-up; cards and leaderboard rows still outbound-link to `model.url`.
- Homepage RSC split (`app/page.tsx` stays `'use client'`). Already tracked in `IMPROVEMENT_PLAN.md`.
- New font files. Commit to Geist Sans + Geist Mono already loaded in `app/layout.tsx`.
- Playwright / visual-regression harness. Verify in the browser; unit-test only new helpers.
- SEO title / OG copy changes (`Hello, AI` in metadata stays). Hero wordmark stays `Hello, Ai` per `data/site.json`.
- Scoring weight changes, new model fields, or API contract changes.

## Product facts the UI must respect

- Frontier set is capped at six models (`data/models.json`), Elo-desc.
- Open-weight set is capped at six (`data/open_weight_models.json`).
- Four categories (`data/categories.json`).
- Articles grow weekly and are date-desc (`data/articles.json`).
- Shared scoring lives in `data/recommend.ts` (API + homepage filter). Do not fork it.
- Design tokens: background `#080A12`, primary `#00E5A0`, secondary `#6366F1`, tertiary `#F472B6`.

## Decisions (locked)

### 1. Compact hero (plan 01)

- Drop `min-height: 100vh`. Hero is a masthead: date pill, `Hello, Ai`, tagline, two CTAs. Padding `120px 24px 56px`.
- Title size `clamp(40px, 7vw, 72px)` so the models section can enter a 900px-tall desktop viewport after plan 02's 3-column grid.
- Remove `ParticleCanvas` (delete the component and its export). Keep the two CSS radial glows.
- Hero content is visible on first paint. No `opacity: 0`, no `useEffect` fade, no scroll-indicator.
- Tagline uses `text-wrap: balance` so “AIs” does not orphan.
- Gradient on “Ai” is mint-weighted so it reads green, not gray-violet:
  `linear-gradient(135deg, #00E5A0 0%, #5EEAD4 28%, #6366F1 68%, #F472B6 100%)`.
- Primary CTA: `See this week's models →` → `#models`.
- Secondary CTA: `Read latest →` → `/articles` (not `#articles`).
- Add `id="top"` on the hero for a future brand-home target.

### 2. Comparable cards (plan 02)

- Frontier `ModelCard` grows spec chips, matching the open-weight pattern: input `$/M`, output `$/M`, context.
- Formatters live in `data/index.ts`:
  - `formatUsdPerMillion(n: number): string` — `10` → `$10/M`, `1.25` → `$1.25/M`
  - `formatContextWindow(tokens: number): string` — `1000000` → `1M ctx`, `500000` → `500K ctx`
- Footer stays `~{elo} Elo` + `Try it →`. Cards still outbound-link to `model.url`.
- `.models-grid` becomes a composed grid (shared with open-weight): 3 columns ≥901px, 2 columns 769–900px, 1 column ≤768px. No `auto-fit minmax(240px)` (that is what produced the 4+2 orphan row).

### 3. Leaderboard as a comparison table (plan 03)

- Delete Elo min–max bars and `eloBarWidth` (`data/leaderboard.ts` + `__tests__/leaderboard.test.ts`).
- Keep `#leaderboard`. Each row is an outbound `<a href={model.url}>`.
- Row shows: rank, name, provider, Elo, input $/M, output $/M, context — using the plan 02 formatters.
- Copy: title `This week's ranking`; subtitle `LMArena text-overall Elo with list price and context. Updated weekly.`
- Do not restyle this into a second card grid.

### 4. Clickable insights (plan 04)

- Lift `task` / `maxCost` state from `ModelsSection` to `Home` so Insights can write the same filter Models reads.
- Extract `categoryTaskKeyword(cat: Category): string` next to `findMatchingCategory` in `data/recommend.ts` (first word, lowercased — today's chip behavior).
- Insight cards become `<button type="button">`. Click toggles that category keyword into `task` (same as chips) and `scrollIntoView`s `#models`.
- Hover border-color stays; add a selected state when the keyword is active.

### 5. Articles + site nav (plan 05)

- Homepage articles: `getHomepageArticles()` = first 3 of `getArticles()`. Link `All dispatches →` to `/articles`.
- Constant `HOMEPAGE_ARTICLE_COUNT = 3` in `data/index.ts`.
- `Nav` is reused on `/articles` and `/articles/[slug]`. Brand is always `<Link href="/">`. Section hrefs are `#id` on `/`, `/#id` elsewhere (`usePathname()`).
- Mobile menu is a real overlay (solid/blurred panel that covers page content), with `aria-expanded` and `aria-controls`.
- Article pages keep their existing back-link in addition to Nav (belt and suspenders).

### 6. Craft polish (plan 06)

- `scroll-margin-top: 88px` on `#top, #models, #leaderboard, #local, #insights, #articles` so the 64px nav does not cover titles.
- Replace every `'Space Grotesk'`, `'JetBrains Mono'`, `'DM Sans'` stack in `globals.css` with `var(--font-geist-sans)` / `var(--font-geist-mono)`. Do not add Google Fonts.
- Search control uses an inline SVG, not `⌕`.
- Cost chip “Any price” is never visually selected at rest (`active` only when `opt.value !== null && maxCost === opt.value`).
- Global `:focus-visible { outline: 2px solid #00E5A0; outline-offset: 3px; }`.
- Bump low-contrast body copy: `.model-desc`, `.insight-text`, `.article-excerpt` to `rgba(255,255,255,0.58)`; `.model-elo` / `.article-date` to `rgba(255,255,255,0.40)`; footer credits to `rgba(255,255,255,0.35)`.
- Scroll spy: if `#models` is below 300px from the top of the viewport (user is still in the hero), `activeSection` is `''` so MODELS is not highlighted.
- Insights grid: 2 columns ≥769px, 1 column mobile, so four categories tessellate 2×2 (no 3+1 leftover).

## Copy (locked, only where a plan touches the section)

| Surface | Title | Subtitle |
|---|---|---|
| Models | This week's frontier | Six APIs, ranked by capability. Filter by task or price. Updated weekly. |
| Leaderboard | This week's ranking | LMArena text-overall Elo with list price and context. Updated weekly. |
| Insights | Where each one leads | Category leaders from the tracked set, as of this week's snapshot. |
| Articles (home) | Dispatches from the frontier | Weekly analysis. No engagement bait. *(keep)* |
| Hero primary | See this week's models → | |
| Hero secondary | Read latest → | |

Do not rewrite article prose, model `desc` fields, or category `insight` fields.

## File map

| File | Plans |
|---|---|
| `app/components/Hero.tsx` | 01 |
| `app/components/ParticleCanvas.tsx` | 01 (delete) |
| `app/components/index.ts` | 01 |
| `app/components/ModelCard.tsx` | 02 |
| `app/components/OpenWeightCard.tsx` | 02 (grid only, via shared CSS) |
| `app/components/ModelFilter.tsx` | 04 (keyword helper), 06 (search SVG, Any price) |
| `app/components/Nav.tsx` | 05, 06 (scroll spy consumer already in page) |
| `app/page.tsx` | 01 (copy via SectionHeader), 02 (grid class), 03, 04, 05, 06 |
| `app/articles/page.tsx` | 05 |
| `app/articles/[slug]/page.tsx` | 05 |
| `app/globals.css` | 01–06 |
| `app/layout.tsx` | none (Geist already loaded) |
| `data/index.ts` | 02, 05 |
| `data/recommend.ts` | 04 |
| `data/leaderboard.ts` | 03 (delete) |
| `__tests__/format-date.test.ts` or new `__tests__/format.test.ts` | 02 |
| `__tests__/recommend.test.ts` | 04 |
| `__tests__/data.test.ts` | 05 |
| `__tests__/leaderboard.test.ts` | 03 (delete) |

## Verification (every plan)

From repo root:

```bash
npx tsc --noEmit
npx jest
npx eslint app/ data/ __tests__/ --max-warnings=0
```

Then a browser pass on `https://helloai.com` via local `npm run dev` (localhost:3000 if free): desktop 1440 and mobile 390, plus every route the plan touched.

Do not run `make deploy` or push.

## Implementation order

01 → 02 → 03 → 04 → 05 → 06.

03 depends on 02 (formatters). 04 depends on nothing else but will conflict with 05/06 if Nav/page.tsx drift — ship 04 before 05. 06 is last so it can fix leftover contrast/focus/font without fighting earlier CSS.

Each plan is independently mergeable: after any plan, the site must build, test, and look coherent (no half-deleted ParticleCanvas, no unused `eloBarWidth` import).
