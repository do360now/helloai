# Comparable Model Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put input price, output price, and context on every frontier card, and compose the shared models grid as 3 / 2 / 1 columns so six cards tessellate.

**Architecture:** Add two pure formatters next to `formatDate` in `data/index.ts` (Jest-locked). `ModelCard` renders three spec chips using those helpers. CSS grid override is shared (`.models-grid` also lays out open-weight cards). No JSON schema changes — `cost_per_million_tokens`, `cost_per_million_tokens_output`, and `context_window` already exist on `Model`.

**Tech Stack:** TypeScript strict, Jest, React 19, CSS in `app/globals.css`.

**Spec:** `docs/superpowers/specs/2026-09-03-homepage-design-evolution-design.md` § Decision 2.

## Global Constraints

- Repo root: `/home/cmc/git/grok/helloai`.
- Do not add fields to `models.json`. Do not change scoring.
- Formatters must be timezone-free and locale-free (literal `$` + `M` / `K`).
- Cards remain outbound `<a href={model.url}>`.
- `.models-grid` is shared with open-weight — both sections must look like 3×2 on a 1100px content width, not 4+2.
- Commit after every task. Do not push or deploy.
- `npx jest` foreground only.

---

### Task 1: `formatUsdPerMillion` and `formatContextWindow`

**Files:**
- Modify: `data/index.ts`
- Create: `__tests__/format-money.test.ts`

**Interfaces:**
- Consumes: nothing beyond `number`.
- Produces (later tasks import these exact names from `@/data`):
  - `formatUsdPerMillion(n: number): string`
  - `formatContextWindow(tokens: number): string`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/format-money.test.ts`:

```ts
import { formatUsdPerMillion, formatContextWindow } from '@/data';

describe('formatUsdPerMillion', () => {
  it('formats integer dollars without decimals', () => {
    expect(formatUsdPerMillion(10)).toBe('$10/M');
    expect(formatUsdPerMillion(2)).toBe('$2/M');
  });

  it('keeps two-decimal prices', () => {
    expect(formatUsdPerMillion(1.25)).toBe('$1.25/M');
    expect(formatUsdPerMillion(4.25)).toBe('$4.25/M');
  });

  it('returns an em dash for non-finite input', () => {
    expect(formatUsdPerMillion(Number.NaN)).toBe('—');
    expect(formatUsdPerMillion(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatContextWindow', () => {
  it('formats millions', () => {
    expect(formatContextWindow(1_000_000)).toBe('1M ctx');
    expect(formatContextWindow(2_000_000)).toBe('2M ctx');
  });

  it('formats thousands', () => {
    expect(formatContextWindow(500_000)).toBe('500K ctx');
    expect(formatContextWindow(128_000)).toBe('128K ctx');
  });

  it('formats small windows in tokens', () => {
    expect(formatContextWindow(800)).toBe('800 ctx');
  });

  it('returns an em dash for non-positive or non-finite input', () => {
    expect(formatContextWindow(0)).toBe('—');
    expect(formatContextWindow(-1)).toBe('—');
    expect(formatContextWindow(Number.NaN)).toBe('—');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/format-money.test.ts`

Expected: FAIL — `formatUsdPerMillion` / `formatContextWindow` are not exported from `@/data`.

- [ ] **Step 3: Implement the formatters**

Append to `data/index.ts` (after `formatDate`):

```ts
export function formatUsdPerMillion(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round(n * 100) / 100;
  const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `$${body}/M`;
}

export function formatContextWindow(tokens: number): string {
  if (!Number.isFinite(tokens) || tokens <= 0) return '—';
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    const body = Number.isInteger(m) ? String(m) : String(Math.round(m * 10) / 10);
    return `${body}M ctx`;
  }
  if (tokens >= 1_000) {
    return `${Math.round(tokens / 1_000)}K ctx`;
  }
  return `${tokens} ctx`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/format-money.test.ts`

Expected: PASS.

Also run: `npx tsc --noEmit` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data/index.ts __tests__/format-money.test.ts
git commit -m "feat(data): format USD/M and context window for cards"
```

---

### Task 2: Spec chips on `ModelCard`

**Files:**
- Modify: `app/components/ModelCard.tsx`
- Modify: `app/globals.css` (model card block)

**Interfaces:**
- Consumes: `formatUsdPerMillion`, `formatContextWindow` from `@/data`; `model.cost_per_million_tokens`, `model.cost_per_million_tokens_output`, `model.context_window`.
- Produces: a `.model-specs` row of three `.model-spec` chips between `.model-desc` and `.model-footer`.

- [ ] **Step 1: Add the chips to `ModelCard`**

At the top of `app/components/ModelCard.tsx`, add:

```ts
import { formatUsdPerMillion, formatContextWindow } from '@/data';
```

Inside the card, after `<p className="model-desc">{model.desc}</p>` and before `<div className="model-footer">`, insert:

```tsx
      <div className="model-specs">
        <span className="model-spec">{formatUsdPerMillion(model.cost_per_million_tokens)} in</span>
        <span className="model-spec">{formatUsdPerMillion(model.cost_per_million_tokens_output)} out</span>
        <span className="model-spec">{formatContextWindow(model.context_window)}</span>
      </div>
```

Leave hover, best-match, rank watermark, tag, provider, name, desc, elo footer, and `Try it →` unchanged.

- [ ] **Step 2: Add chip CSS next to the model-card block**

In `app/globals.css`, after `.model-cta` (still inside the model-cards section, before the open-weight section), add:

```css
.model-specs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 20px;
}

.model-spec {
  font-size: 11px;
  font-family: 'JetBrains Mono', var(--font-geist-mono), monospace;
  font-weight: 600;
  color: rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  padding: 3px 8px;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
```

These intentionally match `.ow-spec` visually. Do not refactor `.ow-spec` in this plan.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/components/ModelCard.tsx app/globals.css
git commit -m "feat(home): show price and context chips on model cards"
```

---

### Task 3: Composed 3 / 2 / 1 grid

**Files:**
- Modify: `app/globals.css` (`.models-grid` and the 768px override)
- Modify: `app/page.tsx` (models section title/subtitle only)

**Interfaces:**
- Consumes: existing `.models-grid` used by both `#models` and `#local`.
- Produces: 3-column desktop, 2-column mid, 1-column mobile. Section copy per spec.

- [ ] **Step 1: Replace `.models-grid`**

Find:

```css
.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}
```

Replace with:

```css
.models-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

@media (max-width: 900px) {
  .models-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

In the existing `@media (max-width: 768px)` block, keep `.models-grid { grid-template-columns: 1fr; gap: 16px; }` so mobile stays one column (768 beats 900).

Do not change `.insights-grid` or `.articles-grid` in this plan.

- [ ] **Step 2: Update models section copy**

In `app/page.tsx` `ModelsSection`, change the `SectionHeader` to:

```tsx
      <SectionHeader
        label="Featured Models"
        title="This week's frontier"
        subtitle="Six APIs, ranked by capability. Filter by task or price. Updated weekly."
      />
```

- [ ] **Step 3: Typecheck + lint**

```bash
npx tsc --noEmit
npx eslint app/components/ModelCard.tsx app/page.tsx data/index.ts --max-warnings=0
```

Expected: PASS.

- [ ] **Step 4: Browser check**

`npm run dev`, open `/#models` at 1440, ~820, and 390.

Must be true:

- Desktop: exactly 3 cards on row 1 and 3 on row 2 (no 4+2). Same for `#local` open-weight cards.
- Each frontier card shows three chips, e.g. Fable `$10/M in`, `$50/M out`, `1M ctx`; Muse `$1.25/M in`; Grok `500K ctx`.
- Tablet (~820): 2 columns. Mobile: 1 column.
- Hover, Best match, dimmed, and outbound `Try it →` still work.
- Open-weight chips (VRAM / t/s / license) are unchanged.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/page.tsx
git commit -m "style(home): 3-column model grid and frontier section copy"
```

---

### Task 4: Plan 02 verification

- [ ] **Step 1: Full gate**

```bash
npx tsc --noEmit
npx jest
npx eslint app/ data/ __tests__/ --max-warnings=0
```

Expected: all green, including new `__tests__/format-money.test.ts`.

- [ ] **Step 2: Stop**

Plan 02 is done. Plan 03 may start next (it imports these formatters).
