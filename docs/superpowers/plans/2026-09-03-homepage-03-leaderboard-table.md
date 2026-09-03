# Leaderboard Comparison Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Elo bar list with comparison rows that show rank, name, Elo, input price, output price, and context — the numbers the cards used to hide.

**Architecture:** Keep `#leaderboard` and the six-row list. Each row becomes an outbound `<a>`. Delete `eloBarWidth` and its tests; min–max bars overstated a ~40-point Elo spread. Reuse `formatUsdPerMillion` and `formatContextWindow` from plan 02 — **do not start this plan until plan 02 is merged**.

**Tech Stack:** React 19, CSS in `app/globals.css`, Jest (delete obsolete tests).

**Spec:** `docs/superpowers/specs/2026-09-03-homepage-design-evolution-design.md` § Decision 3.

## Global Constraints

- Repo root: `/home/cmc/git/grok/helloai`.
- Prerequisite: `formatUsdPerMillion` and `formatContextWindow` exported from `@/data` (plan 02). If they are missing, stop and run plan 02 first.
- Do not add a second card grid. Do not change `models.json` order (already Elo-desc).
- Rows outbound-link to `model.url` with `target="_blank" rel="noopener noreferrer"`.
- Delete `data/leaderboard.ts` only after `app/page.tsx` no longer imports it.
- Commit after every task. Do not push or deploy.

---

### Task 1: Row markup — metrics instead of bars

**Files:**
- Modify: `app/page.tsx` (`LeaderboardSection`, imports)

**Interfaces:**
- Consumes: `getModels()` order; `formatUsdPerMillion`, `formatContextWindow` from `@/data`.
- Produces: `LeaderboardSection` with no `eloBarWidth`, no `.elo-bar-*` nodes. Each row is `<a className="leaderboard-row">`.

- [ ] **Step 1: Confirm plan 02 formatters exist**

Run: `rg -n "export function formatUsdPerMillion|export function formatContextWindow" data/index.ts`

Expected: both present. If not, abort.

- [ ] **Step 2: Replace `LeaderboardSection` in `app/page.tsx`**

Remove `import { eloBarWidth } from '@/data/leaderboard';`.

Extend the `@/data` import to include the formatters (keep existing names):

```ts
import { getSiteConfig, getModels, getCategories, getArticles, getOpenWeightModels, formatDate, formatUsdPerMillion, formatContextWindow } from '@/data';
```

Replace the entire `LeaderboardSection` function with:

```tsx
function LeaderboardSection() {
  return (
    <section id="leaderboard" className="leaderboard-section">
      <div className="leaderboard-inner">
        <SectionHeader
          label="Leaderboard"
          title="This week's ranking"
          subtitle="LMArena text-overall Elo with list price and context. Updated weekly."
        />
        <div className="leaderboard-list">
          {models.map((m, i) => (
            <a
              key={m.id}
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className="leaderboard-row"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <span className={`leaderboard-rank ${i === 0 ? 'leaderboard-rank-1' : 'leaderboard-rank-other'}`}>
                {i + 1}
              </span>
              <div className="leaderboard-info">
                <div className="leaderboard-info-row">
                  <div>
                    <span className="leaderboard-model-name">{m.name}</span>
                    <span className="leaderboard-provider">{m.provider}</span>
                  </div>
                  <span className="leaderboard-elo" style={{ color: m.color }}>{m.elo}</span>
                </div>
                <div className="leaderboard-metrics">
                  <span>{formatUsdPerMillion(m.cost_per_million_tokens)} in</span>
                  <span>{formatUsdPerMillion(m.cost_per_million_tokens_output)} out</span>
                  <span>{formatContextWindow(m.context_window)}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
```

Delete the local `maxElo` / `minElo` / `barWidth` locals — they have no caller after this.

Leave the inline `style={{ display: 'flex', flexDirection: 'column', gap: 12 }}` wrapper **out**; use `.leaderboard-list` instead.

- [ ] **Step 3: Typecheck — expect unused-file only later**

Run: `npx tsc --noEmit`

Expected: PASS. `data/leaderboard.ts` may still exist unused; that is Task 3.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(home): leaderboard rows show price and context"
```

---

### Task 2: Leaderboard CSS — metrics row, clickable row, no bars

**Files:**
- Modify: `app/globals.css` (leaderboard block ~lines 560–633)

**Interfaces:**
- Consumes: Task 1 markup (`.leaderboard-list`, `.leaderboard-metrics`, row is `<a>`).
- Produces: styles below. `.elo-bar-bg` / `.elo-bar-fill` deleted.

- [ ] **Step 1: Add list + metrics rules; make the row a link**

After `.leaderboard-inner { max-width: 800px; margin: 0 auto; }` add:

```css
.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.leaderboard-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-family: 'JetBrains Mono', var(--font-geist-mono), monospace;
  font-size: 12px;
  color: rgba(255,255,255,0.45);
  letter-spacing: 0.02em;
}
```

Update `.leaderboard-row` to include link reset and hover (keep existing padding/background/animation):

```css
.leaderboard-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 24px;
  border-radius: 14px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  animation: fadeUp 0.5s both;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}

.leaderboard-row:hover {
  border-color: rgba(0,229,160,0.25);
  background: rgba(255,255,255,0.04);
  transform: translateY(-1px);
}
```

- [ ] **Step 2: Delete bar CSS**

Delete `.elo-bar-bg` and `.elo-bar-fill` in full.

- [ ] **Step 3: Mobile**

Existing `@media (max-width: 768px)` already stacks `.leaderboard-row`. Keep that. No extra mobile rules required.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "style(home): leaderboard metrics row, drop elo bars"
```

---

### Task 3: Delete `eloBarWidth`

**Files:**
- Delete: `data/leaderboard.ts`
- Delete: `__tests__/leaderboard.test.ts`

**Interfaces:**
- Consumes: Task 1 removed the only production import.
- Produces: no remaining `eloBarWidth` references.

- [ ] **Step 1: Confirm no remaining imports**

Run: `rg -n "eloBarWidth|data/leaderboard" --glob '!docs/**'`

Expected: only `data/leaderboard.ts` and `__tests__/leaderboard.test.ts`.

- [ ] **Step 2: Delete both files**

```bash
git rm data/leaderboard.ts __tests__/leaderboard.test.ts
```

- [ ] **Step 3: Gate**

```bash
npx tsc --noEmit
npx jest
npx eslint app/page.tsx --max-warnings=0
```

Expected: tsc PASS; jest PASS (leaderboard.test.ts gone; format-money tests from plan 02 still pass); eslint PASS.

- [ ] **Step 4: Browser check**

Open `/#leaderboard` at 1440 and 390.

Must be true:

- Six rows, same Elo order as the model cards (Fable first).
- Each row shows Elo plus `in` / `out` / `ctx` (Fable `$10/M in` `$50/M out` `1M ctx`).
- No 4px gradient bars.
- Clicking a row opens `model.url` in a new tab.
- Title is “This week's ranking”; the h2 is not covered by the nav *if plan 06 is not done yet* — do not fix scroll-margin here.
- Rank `1` stays mint; other ranks stay muted.

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: remove unused eloBarWidth helper"
```

(If `git rm` was not committed in step 2, `git add -u` those paths here.)

---

### Task 4: Plan 03 verification

- [ ] **Step 1: Full gate**

```bash
npx tsc --noEmit
npx jest
npx eslint app/ data/ __tests__/ --max-warnings=0
rg -n "eloBarWidth|elo-bar" app/ data/ __tests__/
```

Expected: gates green; `rg` empty.

- [ ] **Step 2: Stop**
