# Compact Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-viewport particle hero with a compact, first-paint-visible masthead so the week's models can enter the first screen.

**Architecture:** Delete the client-only fade and `ParticleCanvas`. Keep the two CSS radial glows. Hero markup stays in `app/components/Hero.tsx`; layout/type/CTA changes live in `app/globals.css`. No data-layer changes.

**Tech Stack:** Next.js 16 App Router, React 19, CSS in `app/globals.css` (no CSS modules).

**Spec:** `docs/superpowers/specs/2026-09-03-homepage-design-evolution-design.md` § Decision 1.

## Global Constraints

- Repo root: `/home/cmc/git/grok/helloai`. All commands run from there.
- Do not add fonts, Playwright, or new dependencies.
- Do not change `data/*`, API routes, or scoring.
- Keep wordmark `Hello, Ai` (lowercase i on Ai).
- Keep hero date in long UTC form (`September 3, 2026`), not `formatDate`'s short form.
- After deleting `ParticleCanvas`, nothing may import it.
- Commit after every task. Do not push or deploy.
- `npx jest` foreground only.

---

### Task 1: Hero markup — visible masthead, new CTAs, no canvas

**Files:**
- Modify: `app/components/Hero.tsx`
- Modify: `app/components/index.ts`
- Delete: `app/components/ParticleCanvas.tsx`

**Interfaces:**
- Consumes: `SiteConfig` (`config.lastUpdated`, `config.tagline`) — unchanged.
- Produces: `<section id="top" className="hero">` with always-visible `.hero-content`, primary `a[href="#models"]` text `See this week's models →`, secondary `a[href="/articles"]` text `Read latest →`. No `ParticleCanvas`, no scroll-indicator, no `useState`/`useEffect`.

- [ ] **Step 1: Confirm ParticleCanvas has a single caller**

Run:

```bash
rg -n "ParticleCanvas" app/
```

Expected: matches only `app/components/Hero.tsx`, `app/components/ParticleCanvas.tsx`, and `app/components/index.ts`. If anything else imports it, stop and report — this plan assumes a single caller.

- [ ] **Step 2: Replace `app/components/Hero.tsx` with the masthead**

Overwrite the file with:

```tsx
import type { SiteConfig } from '@/data/types';

export default function Hero({ config }: { config: SiteConfig }) {
  const formatted = new Date(config.lastUpdated + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <section id="top" className="hero">
      <div className="hero-glow-1" />
      <div className="hero-glow-2" />

      <div className="hero-content">
        <div className="hero-pill">Updated {formatted}</div>

        <h1 className="hero-title">
          Hello, <span className="hero-gradient">Ai</span>
        </h1>

        <p className="hero-tagline">{config.tagline}</p>

        <div className="hero-ctas">
          <a href="#models" className="btn-primary">See this week's models →</a>
          <a href="/articles" className="btn-secondary">Read latest →</a>
        </div>
      </div>
    </section>
  );
}
```

No `'use client'`. If `app/page.tsx` remains a client component, Next will still bundle Hero into the client graph — that is fine and in-scope for this plan.

- [ ] **Step 3: Drop the ParticleCanvas export**

In `app/components/index.ts`, delete the line:

```ts
export { default as ParticleCanvas } from './ParticleCanvas';
```

Leave every other export.

- [ ] **Step 4: Delete the canvas file**

Delete `app/components/ParticleCanvas.tsx`.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS (no output). Failure modes to fix before continuing: leftover `ParticleCanvas` import, unused `useState` import.

- [ ] **Step 6: Commit**

```bash
git add app/components/Hero.tsx app/components/index.ts
git rm app/components/ParticleCanvas.tsx
git commit -m "feat(home): compact hero masthead, drop particle canvas"
```

---

### Task 2: Hero CSS — not 100vh, mint-weighted gradient, balanced tagline

**Files:**
- Modify: `app/globals.css` (hero block ~lines 137–274, plus the `.scroll-indicator` / `.scroll-line` rules and the mobile `.hero` override)

**Interfaces:**
- Consumes: Task 1 markup (`#top.hero`, always-present `.hero-content`, no `.hero-visible`, no `.scroll-indicator`).
- Produces: compact masthead styles as specified below.

- [ ] **Step 1: Replace the hero layout rules**

In `app/globals.css`, change `.hero` from `min-height: 100vh; ... padding: 120px 24px 80px;` to:

```css
.hero {
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 120px 24px 56px;
  position: relative;
  overflow: hidden;
}
```

- [ ] **Step 2: Make `.hero-content` visible without JS**

Replace the `.hero-content` / `.hero-visible` pair with:

```css
.hero-content {
  position: relative;
  z-index: 2;
}
```

Delete `.hero-visible` entirely.

- [ ] **Step 3: Shrink the title, mint-weight the gradient, balance the tagline**

Replace `.hero-title`, `.hero-gradient`, `.hero-tagline`, and `.hero-pill` `margin-bottom` as follows (keep other pill properties):

```css
.hero-pill {
  display: inline-block;
  font-size: 12px;
  font-family: 'JetBrains Mono', var(--font-geist-mono), monospace;
  color: #00E5A0;
  border: 1px solid rgba(0,229,160,0.3);
  border-radius: 100px;
  padding: 6px 20px;
  margin-bottom: 24px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.hero-title {
  font-family: 'Space Grotesk', var(--font-geist-sans), sans-serif;
  font-size: clamp(40px, 7vw, 72px);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: #fff;
  margin-bottom: 16px;
}

.hero-gradient {
  background: linear-gradient(135deg, #00E5A0 0%, #5EEAD4 28%, #6366F1 68%, #F472B6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-tagline {
  font-size: clamp(16px, 2.5vw, 22px);
  color: rgba(255,255,255,0.55);
  max-width: 34em;
  margin: 0 auto 36px;
  line-height: 1.5;
  text-wrap: balance;
}
```

Leave `.hero-ctas`, `.btn-primary`, `.btn-secondary` rules unchanged in this plan.

- [ ] **Step 4: Delete the scroll indicator**

Delete these rules (they have no markup after Task 1):

```css
.scroll-indicator {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  animation: pulse 2s ease-in-out infinite;
}

.scroll-line {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, rgba(255,255,255,0.3), transparent);
}
```

If `@keyframes pulse` is now unreferenced, delete it too. Check with `rg "pulse" app/globals.css`. Keep `@keyframes fadeUp` (cards still use it).

- [ ] **Step 5: Mobile override**

In the `@media (max-width: 768px)` block, keep `.hero { padding: 100px 20px 60px; }` and the existing `.hero-pill` / `.hero-ctas` mobile rules. Do not re-introduce `min-height`.

- [ ] **Step 6: Typecheck + lint**

Run:

```bash
npx tsc --noEmit
npx eslint app/components/Hero.tsx app/components/index.ts --max-warnings=0
```

Expected: both PASS.

- [ ] **Step 7: Browser check**

Run `npm run dev` if it is not already up. Open `/` at 1440×900 and 390×844.

Must be true:

- H1 `Hello, Ai` is visible on first paint (no blank particle field).
- Hero is not a full viewport of empty space; models section heading is reachable without a full-screen scroll on 1440×900.
- “Ai” reads mint/teal, not gray.
- Tagline does not leave “AIs” on its own line.
- Primary button goes to `#models`. Secondary goes to `/articles` (the articles index, not the homepage `#articles` block).
- No canvas element in the hero (`document.querySelector('.hero canvas') === null`).
- No scroll-indicator line at the bottom of the hero.

- [ ] **Step 8: Commit**

```bash
git add app/globals.css
git commit -m "style(home): compact hero layout, mint-weighted gradient"
```

---

### Task 3: Plan 01 verification

**Files:** none new.

- [ ] **Step 1: Full gate**

```bash
npx tsc --noEmit
npx jest
npx eslint app/ data/ __tests__/ --max-warnings=0
```

Expected: all green. Jest should be unchanged in count except nothing referencing ParticleCanvas (there were no canvas tests).

- [ ] **Step 2: Confirm dead code is gone**

```bash
rg -n "ParticleCanvas|hero-visible|scroll-indicator|Chat with one now" app/
```

Expected: no matches.

- [ ] **Step 3: Stop**

Plan 01 is done. Do not start plan 02 in this run unless the owner asks.
