# Review: Graphics and Look (track 4)

Owner: Claude Fable 5.1 (hub session helloai-b9). Review room: `helloai-review`, 2026-09-25.
Related plans: `purpose.md` (Opus, decides WHAT the hero says, decision D1), `scoring-transparency.md` (Sonnet, "why this rank" UI line),
`seo-and-discoverability.md` (Fable, track 7b, shares the OG fix), `claims-guard.md` (Sonnet, guards copy).

Tags: **[C]** confirmed by live request, screenshot or code, **[U]** unverified, **[O]** opinion.

Evidence captured with headless Chromium (Playwright's `chrome-headless-shell`, no Playwright driver needed) against the live site at 16:00 UTC:
`assets/home-desktop-1440.png`, `assets/home-mobile-390.png`. Full-page captures and the article index are in the session scratchpad only.

---

## 1. Problem

The site looks polished and the motion/accessibility work in `AgentSocial.tsx` is careful. Four things undercut it:

1. **Every social share of helloai.com has no image.** Both OG image routes return HTTP 502 in production. **[C]**
2. **The hero says two things.** A brand headline plus a product headline, two CTAs, four text blocks before any content on a phone. **[C]**
3. **The homepage shows the same six models twice** (cards, then leaderboard rows) with the same three numbers, and states Elo with false precision ("~1498" on cards, "1498" on rows, top three within 5 points). **[C]**
4. **No design tokens.** Two CSS variables (fonts); every colour is a hard-coded hex, repeated across `globals.css` (50 occurrences of 24 hex values) and inline in components. **[C]**

Plus a handful of smaller contrast, type-size and labelling issues listed in section 2.

## 2. Evidence

### 2.1 OG images return 502 [C], root cause found [C], fix verified locally [C]

| Request | Result |
|---|---|
| `GET https://helloai.com/opengraph-image` | 502, 3 consecutive tries |
| `GET https://helloai.com/articles/opus-5-5-cuts-price-grok-4-7-same-rate/opengraph-image` | 502 |
| `GET https://helloai.com/` head | `og:image` and `twitter:image` point at the 502 URL |

Local reproduction: `npm run build && next start`, then the same two requests. The server drops the connection and logs:

```
⨯ Error: failed to pipe response
  [cause]: Error: Expected <div> to have explicit "display: flex", "display: contents", or "display: none" if it has more than one child node.
```

That is Satori (the renderer behind `next/og`) rejecting a `<div>` that has more than one child and no `display` property. Two offenders:

- `app/opengraph-image.tsx`, the "Headline" div: children are a text node and a `<span>`, no `display`.
- `app/articles/[slug]/opengraph-image.tsx`, the bottom URL div: `helloai.com/articles/{slug}` compiles to two text children, no `display`.

Both files are unchanged since the first commit (`git log`). **[U]** whether the share image ever rendered in production; a `next/og` version bump may have tightened the check. Nothing in `__tests__/` exercises either route.

Not the cause: `runtime = 'edge'` (the routes fail identically under the Node server), Azure, or the Docker image.

The fix is three lines. Verified locally: after the patch both routes return `200 image/png` (75 KB and 74 KB). The diff is at `assets/og-image-display-flex.diff` and the rendered results at `assets/og-home-after-fix.png` and `assets/og-article-after-fix.png`.

Also in these files, for `purpose.md` step 1 (copy) rather than this plan: the home image shows a "GPT" pill, and `models.json` tracks no GPT model. The 🤖 emoji renders fine (checked in the local output), so it is not a problem.

### 2.2 Hero carries two headlines [C]

`app/components/Hero.tsx` renders, in order: pill "Updated …", `<h1>` "Hello, Ai", tagline "Your unbiased guide to the world's smartest AIs", then "Great ideas start with a conversation." (styled as a second headline, `.hero-social-intro` at clamp(26px, 2.7vw, 35px)), then "Find the right AI. Introduce it to another. See what you can make together.", then two CTAs (`#models`, `app.helloai.com`), then a text link to `/articles`.

- The `<h1>` is the brand name, not a benefit. The value proposition is the second block.
- Desktop (1440): the text column is about 40% of the width; the animation card takes the rest. Fine.
- Mobile (390): the animation card is below the fold. A phone user sees four stacked text blocks and two buttons before any content (`assets/home-mobile-390.png`).

`purpose.md` D1 decides whether the site is directory-first or the front door to the app. This plan does not depend on that answer; it only asks for one headline, one subline, one primary CTA, whichever way D1 goes.

### 2.3 Models shown twice, Elo precision inconsistent [C]

`app/page.tsx`: `ModelsSection` renders six `ModelCard`s with a large rank numeral (1–6, `models.json` order = Elo order). `LeaderboardSection` then renders the same six as rows with the same rank, the same `in / out / context` figures, and the same Elo. `ModelCard` prints `~{elo} Elo`; the leaderboard row prints `{elo}` exactly.

Sonnet (track 6) confirmed the spread is 42 points across six models and the top three sit within 5 points, inside LMArena's normal confidence interval. Showing "1498" next to "1493" invites a reader to rank them; the tilde on the card admits that is not safe.

### 2.4 Mobile page length [C]

At 390 px width the homepage exceeds 9000 px. A 9000 px full-page capture cut off inside the Insights section; Articles never appeared. Section order is Hero, Models, Leaderboard, Open weight, Insights, Articles. **[O]** Insights (category leaders) is the most decision-relevant section and the second-to-last thing a phone user reaches.

### 2.5 Contrast and type size [C]

WCAG contrast ratios computed against `#080A12`:

| Element | Colour | Ratio | AA (4.5:1) |
|---|---|---|---|
| Body greys (`#89959e`, `#8b99ab`, `#9aa8b5`, `#b7c2cf`) | | 6.4 to 11.0 | pass |
| Mint accent `#00E5A0` | | 12.0 | pass |
| Pink `#F472B6` | | 7.5 | pass |
| Indigo `#6366F1` as text | | 4.42 | fail (small text) |
| Card "Try it →" at `rgba(255,255,255,0.3)` before hover | ≈ `#4a4b51` | ≈ 2.3 | fail |

Type sizes: hero pill 10 px, invitation line 10 px, conversation captions 10–11 px mono uppercase with letter-spacing; 9 px inside the scene below 1100 px (`globals.css:1111`); 8 px eyebrow on `/concepts/agent-social` at mobile (`globals.css:1154`). Not a WCAG failure by itself, but hard to read.

### 2.6 What is done right [C]

- `AgentSocial.tsx`: honours `prefers-reduced-motion` (matchMedia in code and CSS rule at `globals.css:1132`), pauses when off-screen or when the tab is hidden, exposes a pause button, gives the SVG `title`/`desc`, uses `aria-pressed` on the scene selector.
- `Nav.tsx`: hamburger has `aria-label`, `aria-expanded`, `aria-controls`.
- Global `:focus-visible` rule at `globals.css:19`.
- Model names, descriptions and prices are all in the SSR HTML (crawlers and reader modes see content without JS).

### 2.7 Tokens and payload [C]

- `globals.css` declares two custom properties (the Geist fonts). Colours: 24 distinct hex values, 50 occurrences. `ModelCard.tsx` and `OpenWeightCard.tsx` duplicate `hexToRgb` and the hover gradient inline.
- Payload on the live homepage: 10 JS chunks, 700 KB raw / 212 KB compressed; HTML 63 KB raw / 13 KB gzip; CSS 38 KB. `app/page.tsx` is one `'use client'` tree that imports models, categories, articles and open-weight JSON at module scope, so all data ships in the bundle as well as in the HTML. Acceptable at six models; worth knowing before adding more. **[U]** No Lighthouse run (no tool on this box).
- Nav label "LOCAL" for the open-weight section. **[O]** Ambiguous.

## 3. Decisions needed (cmc)

**Adopted 2026-09-25 by cmc as recommended** (README "Decisions taken"): G1 minimal fix; G2 in its revised form (interval on own score, "not available" note otherwise, borrowed labelled without interval, and the D5/E1 consequence that borrowed-score models are unranked); G3 keep rows, drop card rank numerals; G4 one section order on all widths.

- **G1. OG fix scope.** (a) Minimal three-line fix now (recommended, tested), or (b) also redesign the images while in there. Recommend (a) now, (b) folded into the hero step once D1 is decided.
- **G2. Elo display.** Astra's challenge (room, 2026-09-25) is accepted: a rounded figure or a tilde is not a substitute for uncertainty, and LMArena publishes model-specific confidence intervals (https://arena.ai/blog/ranking-method). **[C]** `scripts/arena.py` ingests `score` only (`_ArenaEntry` has `score` and an unused `votes`; no interval field), so the site holds no interval data today. Options: (a) ingest the interval (track 6, Sonnet: add `elo_ci` or `elo_lower`/`elo_upper` to `models.json` when the snapshot provides it) and display `1498 ± 6`; (b) until (a) exists, show the exact score with a visible note "intervals not available in our source; gaps of a few points are not meaningful", and drop the tilde on cards; (c) tiers. Recommend (a) as the target, (b) as the interim. A blanket "~10 points is noise" line is withdrawn from this plan; `purpose.md` step 3 carries the same wording and should follow. Sonnet's track 6 owns the data; this plan owns only how the number looks.
- **G3. Drop the leaderboard section or the card rank numerals?** They duplicate each other. Recommend keeping the rows (they are scannable) and removing the rank numeral from cards, so cards become "the six we track" and rows become "the order".
- **G4. Mobile section order.** Move Insights above Open weight on all widths, or reorder only under 768 px with CSS `order`. Recommend all widths; one order is easier to reason about.

## 4. Implementation plan

Each step is independent unless noted. A cold session can pick up any step alone.

### Step 1. Fix the OG images (do this week)

1. Apply `assets/og-image-display-flex.diff` (`git apply docs/review/assets/og-image-display-flex.diff`).
2. Add `__tests__/og-images.test.ts` that imports both default exports, calls them (the article one with `params: Promise.resolve({ slug: <first article slug> })`), and asserts the response is `200` with `content-type: image/png`. `ImageResponse` runs under Node in jest; if jest's environment blocks it, fall back to a build-time smoke script in `scripts/` that starts `node .next/standalone/server.js` and curls both routes. Either way the check must fail on today's code.
3. Add the two routes to `.claude/agents/api-smoke-tester.md` so every deploy checks them (status 200, `image/png`, size > 10 KB).
4. Remove the "GPT" pill from the model pill list in `app/opengraph-image.tsx` (this step owns that file; `purpose.md` step 1 does not touch it). Leave the other three pills; a follow-up can render the list from `getModels()`.
5. After deploy: fetch both URLs from the live site, then paste the homepage URL into the X card validator or Slack to confirm a preview renders.

Files: `app/opengraph-image.tsx`, `app/articles/[slug]/opengraph-image.tsx`, `__tests__/og-images.test.ts` (new), `.claude/agents/api-smoke-tester.md` (and its integrity hash, per CLAUDE.md).

### Step 2. One-headline hero (after `purpose.md` D1)

1. In `Hero.tsx`, keep one `<h1>` carrying the value proposition. Whichever D1 answer: the brand name moves to the nav (already there) and the pill; the `<h1>` becomes the tagline line (directory-first) or the conversation line (front door). The other line becomes a single subline or is cut.
2. One primary CTA. The other becomes a text link, styled like `.hero-latest`. Keep the `/articles` link as the tertiary text link, or fold it into the nav only.
3. Mobile: under 768 px, render the pill, `<h1>`, subline and primary CTA above the fold at 390×844. Check with the screenshot command in section 6.
4. Reuse the same headline in `app/opengraph-image.tsx` so the share image and the hero agree.
5. The scene stays as the hero visual (settled in the room; `purpose.md` step 5 agrees). It is the only artwork on the site and it is already labelled "Illustrative scene"; do not move it under a heading that promises collaboration evidence (`collaboration.md` requires n ≥ 20 before any evidence section exists). The two copies of `AgentSocial.tsx` (directory hero and app welcome) are kept in sync per `app-fit.md` step 6 (cross-reference header comments plus a whitespace-stripped diff check); no shared package, since the repos sit on different Next majors with separate deploys and the file has been byte-identical since it was copied.

Files: `app/components/Hero.tsx`, `app/globals.css` (hero block at lines 185–215 and 1054–1071), `data/site.json` (`tagline`), `app/opengraph-image.tsx`.

### Step 3. Elo display and de-duplication (G2, G3)

1. Add `formatElo(model): string` to `data/index.ts` next to `formatUsdPerMillion`. If the model carries an interval field (G2 option a, once track 6 ingests it), return `${elo} ± ${halfWidth}`; otherwise return the exact `${elo}` with no tilde, and render one note per section ("Intervals not available in our source; small gaps are not meaningful") from a single string constant so cards, rows and `/methodology` agree. Never round or add a tilde as a stand-in for an interval. When `elo_source.config` is present (`elo-provenance.md` step 1b: the measured effort variant, e.g. `max` or `high`), show it in the muted grey next to the score on the leaderboard row (`1498 ± 8 · max`) and in the card's `title` attribute, so a reader can trace which configuration was measured. Sequencing per the README: `elo-provenance.md` lands before this step, since `formatElo` reads its fields.
2. Use it in `ModelCard.tsx`, `OpenWeightCard.tsx`, `app/page.tsx` leaderboard rows, and `/api/openapi.json` examples if any show Elo.
2b. **Borrowed scores must be labelled where the number is shown.** **[C, from `.claude/agent-memory/leaderboard-updater.md`, not re-checked on arena.ai]** the Opus 5.5 card's 1493 is `claude-opus-5-high` (Opus 5's score) and the Grok 4.7 card's 1456 is `grok-4.6-high`; neither successor has a text-board slug yet. `elo-provenance.md` (Sonnet, track 6) adds `elo_source.matches_listed_model`. When it is false, `formatElo` output gets a short suffix or badge ("score is Opus 5's", built from `elo_source.slug`) on the card footer and the leaderboard row, in the muted grey, with a `title` attribute carrying the slug and snapshot date. The label uses the same string constant as `/methodology` (it lives next to `METHODOLOGY_URL` in `data/index.ts`). A borrowed score never shows an interval, even if the predecessor's row on Arena has one: `elo-provenance.md` only permits `ci_low/ci_high` when `matches_listed_model` is true, so the three states of `formatElo` are mutually exclusive: own score with interval, own score without interval, borrowed score with label and no interval. The display then follows `purpose.md` D5, whichever way cmc decides: (i) **operational exclusion** (`elo-provenance.md` step 4: `isRated(model)` is false, the model comes back in the `unrated` array with a reason, never in `recommendations`): the card and row show "Unranked · no score of its own yet" in place of the number, it sorts after all ranked models in both the card grid and the leaderboard rows, never carries the "Best match" gradient, and the rank numeral is omitted; (ii) **labelled inheritance for every vendor**: the borrowed label above, the card keeps its position, and it may be "Best match" only if the scoring plan says borrowed scores participate. Either state must be visibly different from an own score at a glance; the current mix (borrowed numbers shown as the model's own) is the one thing the display must not do.
3. G3: remove `.model-rank-bg` from `ModelCard` (keep it on `OpenWeightCard`, which has no row duplicate), or remove the leaderboard section. Do not leave both.
4. Sonnet's "why this rank" line (`scoring-transparency.md`) lands in `ModelFilter.tsx`; coordinate so the card footer has room for it. Suggested: the footer row holds `formatElo` on the left and the "why" text replaces "Try it →" when a filter is active.

Files: `data/index.ts`, `app/components/ModelCard.tsx`, `app/components/OpenWeightCard.tsx`, `app/page.tsx`, `app/globals.css` (`.model-rank-bg`, `.model-elo`, `.leaderboard-elo`), `__tests__/` (one case for `formatElo`).

### Step 4. Mobile order and readability (G4, 2.5)

1. Reorder sections in `app/page.tsx` `Home()` to Hero, Models, Insights, Leaderboard, Open weight, Articles (or the G4 choice). Update `NAV_LINKS` order in `Nav.tsx` and the scroll-spy array in `page.tsx` to match.
2. Raise minimum type size to 11 px for anything a reader must read (pill, captions, invitation, conversation). Decorative labels inside the SVG may stay smaller. The 8 px eyebrow on `/concepts/agent-social` only matters if `app-fit.md` A3 keeps that page; the recommendation there is to delete it, so skip the eyebrow unless A3 = keep.
3. Contrast: `.model-cta` idle colour from `rgba(255,255,255,0.3)` to `rgba(255,255,255,0.55)` (≈ 6.3:1 against `#080A12`, verified by Opus). Where `#6366F1` is used as small text, swap to `#8B8DF7` or similar (≈ 6:1) and keep `#6366F1` for borders and fills.
4. Rename the nav item "local" to "open weight" (keep the section id `local` so existing anchors work).

Files: `app/page.tsx`, `app/components/Nav.tsx`, `app/globals.css`.

### Step 5. Design tokens

1. In `globals.css` `:root`, declare `--bg`, `--fg`, `--fg-muted`, `--accent`, `--accent-2`, `--accent-3`, `--border`, `--card` and the four category colours. Values are the current hexes; nothing changes visually.
2. Replace the 50 hex occurrences with `var(--…)`. Do it with a scripted sed pass per colour and eyeball the diff; do not hand-edit 1154 lines.
3. Move `hexToRgb` and the card hover style into one helper (`app/components/cardStyle.ts`) used by `ModelCard` and `OpenWeightCard`.
4. Record the token names in CLAUDE.md "Design System".

Files: `app/globals.css`, `app/components/ModelCard.tsx`, `app/components/OpenWeightCard.tsx`, `app/components/cardStyle.ts` (new), `CLAUDE.md`.

## 5. Acceptance checks

- Step 1: `curl -sI https://helloai.com/opengraph-image | head -1` returns 200; same for one article; the new test fails on `git stash`-ed code and passes after; a Slack or X preview shows the image.
- Step 2: at 390×844 the pill, `<h1>`, subline and primary CTA are visible without scrolling (screenshot); exactly one `<h1>` on the page; `npx tsc --noEmit` and `npm run build` pass.
- Step 3: no page shows an Elo with more precision than G2 allows (`grep -rn '{m.elo}\|model.elo' app/` returns only `formatElo` calls); cards and rows do not both show a rank.
- Step 4: no readable text under 11 px (`grep -nE 'font-size:\s*(8|9|10)px' app/globals.css` returns only SVG-internal or decorative selectors, each with a comment saying so); `.model-cta` idle contrast ≥ 4.5:1.
- Step 5: `grep -cE '#[0-9a-fA-F]{6}' app/globals.css` returns only the `:root` block count; visual diff of the homepage screenshot before/after is pixel-identical or explainable.

## 6. How to reproduce the evidence

```bash
C=~/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell
$C --headless --no-sandbox --disable-gpu --hide-scrollbars --window-size=1440,900 \
   --virtual-time-budget=8000 --screenshot=home-desktop.png https://helloai.com/
$C --headless --no-sandbox --disable-gpu --hide-scrollbars --window-size=390,844 \
   --virtual-time-budget=8000 --screenshot=home-mobile.png https://helloai.com/
curl -sI https://helloai.com/opengraph-image | head -1
```

Local OG reproduction: `npm run build`, then `node .next/standalone/server.js` (the Dockerfile's entrypoint; `next start` also works but warns about `output: standalone`), then `curl -sI http://127.0.0.1:3000/opengraph-image`. Stop the server by PID; do not `pkill -f 'next'` on a workstation that runs other Next apps.

## 7. Not checked

- Lighthouse / Core Web Vitals (no tool available on this workstation).
- Real devices: all mobile evidence is a 390 px headless viewport.
- Dark/light: the site is dark-only by design; no light theme was evaluated.
- The `/concepts/agent-social` page beyond its type sizes; `app-fit.md` (Opus) covers whether it should exist.
