# Craft Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the leftover craft gaps from the 2026-09-03 design review: section titles hiding under the nav, a 3+1 insights leftover, unloaded display fonts, a bogus search glyph, a stuck “Any price” chip, missing focus rings, too-dim body copy, and a scroll spy that highlights MODELS while the user is still in the hero.

**Architecture:** CSS-first. One small ModelFilter markup change (SVG + cost-chip active rule). One small scroll-spy change in `Home`. No new packages. Geist is already loaded in `app/layout.tsx` — this plan **stops naming** Space Grotesk / JetBrains Mono / DM Sans rather than adding those families.

**Tech Stack:** CSS in `app/globals.css`, React 19 in `ModelFilter.tsx` and `app/page.tsx`.

**Spec:** `docs/superpowers/specs/2026-09-03-homepage-design-evolution-design.md` § Decision 6.

## Global Constraints

- Repo root: `/home/cmc/git/grok/helloai`.
- Run this plan **last** (after 01–05) so you are polishing the evolved page, not the old splash.
- Do not add `next/font` families. Do not change `app/layout.tsx` metadata.
- Do not change scoring, JSON, or API routes.
- Commit after every task. Do not push or deploy.

---

### Task 1: `scroll-margin-top` and a 2×2 insights grid

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: section ids `#top` (plan 01), `#models`, `#leaderboard`, `#local`, `#insights`, `#articles`.
- Produces: those ids have `scroll-margin-top: 88px` (64px nav + 24px breathing room). `.insights-grid` is 2 columns on desktop.

- [ ] **Step 1: Add the rule at the top of the sections block**

Immediately after the `/* ─── SECTIONS ──── */` comment (before `.section-header`), insert:

```css
#top,
#models,
#leaderboard,
#local,
#insights,
#articles {
  scroll-margin-top: 88px;
}
```

- [ ] **Step 2: Tessellate the four insight cards**

Find:

```css
.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
```

Replace with:

```css
.insights-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
```

The existing `@media (max-width: 768px) { .insights-grid { grid-template-columns: 1fr; } }` already collapses to one column. Do not change `.articles-grid` (homepage now has exactly 3 cards; 3 columns is acceptable).

- [ ] **Step 3: Browser check (this task only)**

On `/`, click each desktop nav link. The section **title** (h2) must sit fully below the fixed nav, not tucked under it. Repeat from `/articles` via `/#leaderboard`. Insights are 2×2 on desktop, 1 column on mobile.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "fix(home): scroll-margin for section titles; 2x2 insights grid"
```

---

### Task 2: Geist-only font stacks

**Files:**
- Modify: `app/globals.css` (every `font-family:` that names Space Grotesk, JetBrains Mono, or DM Sans)

**Interfaces:**
- Consumes: `--font-geist-sans` / `--font-geist-mono` already set by `app/layout.tsx`.
- Produces: zero remaining string literals `'Space Grotesk'`, `'JetBrains Mono'`, `'DM Sans'`.

- [ ] **Step 1: Count current references**

Run: `rg -n "Space Grotesk|JetBrains Mono|DM Sans" app/globals.css`

Expected: many hits (body, nav, hero, chips, cards, footer, etc.). You will replace all of them.

- [ ] **Step 2: Replace by category**

Use three exact replacements across the file (replace_all):

1. `'DM Sans', var(--font-geist-sans), system-ui, sans-serif` → `var(--font-geist-sans), system-ui, sans-serif`
2. `'JetBrains Mono', var(--font-geist-mono), monospace` → `var(--font-geist-mono), ui-monospace, monospace`
3. `'Space Grotesk', var(--font-geist-sans), sans-serif` → `var(--font-geist-sans), system-ui, sans-serif`

If a rule names those families in a different order, fix it by hand to the same Geist-first stack. Do not leave a family name “for fallback” — those files are not loaded.

- [ ] **Step 3: Confirm zero leftovers**

Run: `rg -n "Space Grotesk|JetBrains Mono|DM Sans" app/`

Expected: empty. (Docs under `docs/` may still mention them historically — do not edit those in this task.)

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "style: use loaded Geist stacks, drop unloaded display fonts"
```

---

### Task 3: Search SVG, Any-price chip, focus rings, contrast

**Files:**
- Modify: `app/components/ModelFilter.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: existing `ModelFilter` props (`maxCost`, `hasFilters`, etc.).
- Produces: SVG search icon; cost chip `active` only when `opt.value !== null && maxCost === opt.value`; global `:focus-visible`; contrast bumps listed below.

- [ ] **Step 1: Replace the `⌕` glyph with an SVG**

In `ModelFilter.tsx`, replace:

```tsx
        <span className="model-filter-icon">⌕</span>
```

with:

```tsx
        <svg className="model-filter-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
```

`.model-filter-icon` is already `position: absolute; left: 16px;`. Change its CSS from `font-size: 20px; ... line-height: 1;` to a sized SVG:

```css
.model-filter-icon {
  position: absolute;
  left: 16px;
  width: 18px;
  height: 18px;
  color: rgba(255,255,255,0.35);
  pointer-events: none;
}
```

- [ ] **Step 2: “Any price” is not selected at rest**

In the cost-chip map in `ModelFilter.tsx`, replace:

```ts
          const active = maxCost === opt.value;
```

with:

```ts
          const active = opt.value !== null && maxCost === opt.value;
```

Clicking “Any price” still calls `onMaxCostChange(null)`. It just no longer draws the selected indigo border on first paint.

- [ ] **Step 3: Global focus + contrast**

At the end of the BASE block in `app/globals.css` (after `body { ... }`), add:

```css
:focus-visible {
  outline: 2px solid #00E5A0;
  outline-offset: 3px;
}
```

Then bump these existing color values (only the `color:` line):

| Selector | New color |
|---|---|
| `.model-desc` | `rgba(255,255,255,0.58)` |
| `.insight-text` | `rgba(255,255,255,0.58)` |
| `.article-excerpt` | `rgba(255,255,255,0.58)` |
| `.model-elo` | `rgba(255,255,255,0.40)` |
| `.article-date` | `rgba(255,255,255,0.40)` |
| `.article-readtime` | `rgba(255,255,255,0.40)` |
| `.footer-credits` | `rgba(255,255,255,0.35)` |

Leave `.hero-tagline` at whatever plan 01 set (`0.55`). Leave `.article-page-body p` at `0.65`.

- [ ] **Step 4: Typecheck + lint**

```bash
npx tsc --noEmit
npx eslint app/components/ModelFilter.tsx --max-warnings=0
```

Expected: PASS.

- [ ] **Step 5: Browser check**

- Search field shows a magnifying-glass SVG, not a faint ring/glyph.
- On load, **Any price** looks like the other idle chips (no indigo border). **Under $8/M** gets the selected style only after click.
- Tab through nav, chips, cards, insight buttons, article links: mint outline on each.
- Model descriptions and article excerpts are readable against `#080A12` (not 0.40 gray).

- [ ] **Step 6: Commit**

```bash
git add app/components/ModelFilter.tsx app/globals.css
git commit -m "fix(home): search icon, cost-chip rest state, focus, contrast"
```

---

### Task 4: Scroll spy does not highlight MODELS in the hero

**Files:**
- Modify: `app/page.tsx` (`Home` `useEffect`)

**Interfaces:**
- Consumes: section ids in DOM order. `Nav` already treats unknown `activeSection` as no highlight.
- Produces: `activeSection === ''` while `#models.getBoundingClientRect().top >= 300`.

- [ ] **Step 1: Update the spy**

Replace the `handleScroll` body in `Home` with:

```ts
    const handleScroll = () => {
      const modelsEl = document.getElementById('models');
      if (!modelsEl || modelsEl.getBoundingClientRect().top >= 300) {
        setActiveSection('');
        return;
      }
      const sections = ['articles', 'insights', 'local', 'leaderboard', 'models'] as const;
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 300) {
          setActiveSection(id);
          break;
        }
      }
    };
```

Keep the listener `passive: true` and the cleanup. Initial state should match: change

```ts
  const [activeSection, setActiveSection] = useState('models');
```

to

```ts
  const [activeSection, setActiveSection] = useState('');
```

so first paint in the hero is un-highlighted. (Plan 05 Nav default is already `activeSection = ''`.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 3: Browser check**

- Load `/`: no nav item is mint. Scroll into models: MODELS turns mint. Scroll to leaderboard: LEADERBOARD, etc.
- Refresh while `#insights` is in the URL hash: after load, INSIGHTS is mint (scroll spy runs on scroll; also invoke `handleScroll()` once on mount so hash loads highlight correctly).

Add `handleScroll();` immediately before `window.addEventListener` so a `/#leaderboard` landing paints the right link without waiting for a scroll event.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "fix(home): scroll spy idle in the hero, run once on mount"
```

---

### Task 5: Plan 06 + sequence verification

- [ ] **Step 1: Full gate**

```bash
npx tsc --noEmit
npx jest
npx eslint app/ data/ __tests__/ --max-warnings=0
```

Expected: all green.

- [ ] **Step 2: Spec coverage walk**

Open `docs/superpowers/specs/2026-09-03-homepage-design-evolution-design.md` and confirm each locked decision is now in the product:

- 01 Compact hero
- 02 Chips + 3/2/1 grid
- 03 Leaderboard metrics, no bars
- 04 Clickable insights
- 05 Three homepage articles + nav on article routes
- 06 This plan

If a prior plan was skipped, stop and report — do not silently implement it here.

- [ ] **Step 3: End-to-end browser pass**

Desktop 1440 and mobile 390, in this order:

1. `/` first paint: masthead visible, no particles, MODELS not highlighted.
2. Six frontier cards in 3×2 with price/context chips.
3. Filter “coding” and insight “Coding & Engineering” stay in sync.
4. Leaderboard rows show Elo + in/out/ctx and open the provider URL.
5. Homepage articles = 3, plus All dispatches.
6. `/articles` and one slug: site nav present, brand home, mobile menu covers content.
7. Hash links do not hide h2 under the nav.
8. Tab focus is visible.

- [ ] **Step 4: Stop**

Sequence complete. Do not deploy unless the owner asks.
