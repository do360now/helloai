# Clickable Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make category insight cards drive the same homepage filter the chips already use, then scroll the user to the models grid.

**Architecture:** Extract `categoryTaskKeyword` next to `findMatchingCategory` so chips and insights cannot drift. Lift `task` / `maxCost` from `ModelsSection` to `Home`. Insight cards become `<button type="button">` that toggle the keyword and `scrollIntoView` `#models`.

**Tech Stack:** TypeScript, Jest (`__tests__/recommend.test.ts`), React 19 client state in `app/page.tsx`.

**Spec:** `docs/superpowers/specs/2026-09-03-homepage-design-evolution-design.md` § Decision 4.

## Global Constraints

- Repo root: `/home/cmc/git/grok/helloai`.
- Do not change `SCORING_WEIGHTS` or `scoreAndRank` math.
- Keyword rule is locked: first whitespace-delimited word of `cat.name`, lowercased. Today's chips already do this (`Overall Preference` → `overall`).
- Smooth scroll is allowed (`scroll-behavior: smooth` is already on `html`).
- Commit after every task. Do not push or deploy.

---

### Task 1: `categoryTaskKeyword` helper

**Files:**
- Modify: `data/recommend.ts`
- Modify: `__tests__/recommend.test.ts`

**Interfaces:**
- Consumes: `Category.name: string`.
- Produces: `export function categoryTaskKeyword(cat: Category): string` — Task 2 (chips) and Task 3 (insights) both call this. Do not inline `split(' ')[0]` anywhere else after this plan.

- [ ] **Step 1: Write the failing tests**

In `__tests__/recommend.test.ts`, add to the existing import:

```ts
import { scoreAndRank, findMatchingCategory, categoryTaskKeyword, SCORING_WEIGHTS } from '../data/recommend';
```

After the `findMatchingCategory` describe block, add:

```ts
describe('categoryTaskKeyword', () => {
  test('returns the first word, lowercased', () => {
    expect(categoryTaskKeyword({ name: 'Overall Preference', leader: 'x', insight: '', icon: '', color: '#000000' })).toBe('overall');
    expect(categoryTaskKeyword({ name: 'Coding & Engineering', leader: 'x', insight: '', icon: '', color: '#000000' })).toBe('coding');
    expect(categoryTaskKeyword({ name: 'Hard Reasoning & Science', leader: 'x', insight: '', icon: '', color: '#000000' })).toBe('hard');
    expect(categoryTaskKeyword({ name: 'Honest Daily Use', leader: 'x', insight: '', icon: '', color: '#000000' })).toBe('honest');
  });

  test('matches live category records', () => {
    for (const cat of categories) {
      expect(categoryTaskKeyword(cat)).toBe(cat.name.split(' ')[0].toLowerCase());
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/recommend.test.ts -t categoryTaskKeyword`

Expected: FAIL — `categoryTaskKeyword` is not exported.

- [ ] **Step 3: Implement**

In `data/recommend.ts`, immediately above `findMatchingCategory`, add:

```ts
export function categoryTaskKeyword(cat: Category): string {
  return cat.name.split(' ')[0].toLowerCase();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/recommend.test.ts`

Expected: PASS (existing tests plus the new describe).

- [ ] **Step 5: Commit**

```bash
git add data/recommend.ts __tests__/recommend.test.ts
git commit -m "feat(data): categoryTaskKeyword shared by chips and insights"
```

---

### Task 2: Chips call the helper

**Files:**
- Modify: `app/components/ModelFilter.tsx`

**Interfaces:**
- Consumes: `categoryTaskKeyword` from `@/data/recommend`.
- Produces: chip `keyword` is `categoryTaskKeyword(cat)` instead of `cat.name.split(' ')[0].toLowerCase()`.

- [ ] **Step 1: Switch the chip keyword**

At the top of `ModelFilter.tsx` add:

```ts
import { categoryTaskKeyword } from '@/data/recommend';
```

Inside the categories `.map`, replace:

```ts
          const keyword = cat.name.split(' ')[0].toLowerCase();
```

with:

```ts
          const keyword = categoryTaskKeyword(cat);
```

Leave cost chips, search input, and clear button alone.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/components/ModelFilter.tsx
git commit -m "refactor(home): model filter chips use categoryTaskKeyword"
```

---

### Task 3: Lift filter state and wire insight buttons

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `categoryTaskKeyword`; existing `ModelFilter` callbacks.
- Produces: `task` / `maxCost` live on `Home`. `ModelsSection` and `InsightsSection` receive them as props. Insight cards are `<button type="button" className="insight-card">`.

- [ ] **Step 1: Lift state into `Home`**

In `app/page.tsx`:

1. Add import:

```ts
import { categoryTaskKeyword } from '@/data/recommend';
```

(`scoreAndRank` import stays.)

2. Change `ModelsSection` to take props instead of owning state. Replace the function signature and the two `useState` lines with:

```tsx
function ModelsSection({
  task,
  maxCost,
  onTaskChange,
  onMaxCostChange,
}: {
  task: string;
  maxCost: number | null;
  onTaskChange: (t: string) => void;
  onMaxCostChange: (v: number | null) => void;
}) {
  const hasFilters = task.trim() !== '' || maxCost !== null;
```

and pass those callbacks into `ModelFilter` (same prop names as today: `onTaskChange`, `onMaxCostChange`, `onClear={() => { onTaskChange(''); onMaxCostChange(null); }}`).

3. Change `InsightsSection` to:

```tsx
function InsightsSection({
  task,
  onTaskChange,
}: {
  task: string;
  onTaskChange: (t: string) => void;
}) {
  return (
    <section id="insights" className="insights-section">
      <SectionHeader
        label="Category Breakdown"
        title="Where each one leads"
        subtitle="Category leaders from the tracked set, as of this week's snapshot."
      />
      <div className="insights-grid">
        {categories.map((cat, i) => {
          const keyword = categoryTaskKeyword(cat);
          const active = task.toLowerCase().includes(keyword);
          return (
            <button
              key={cat.name}
              type="button"
              className={`insight-card${active ? ' insight-card-active' : ''}`}
              style={{
                animationDelay: `${i * 0.1}s`,
                borderColor: active ? cat.color + '60' : undefined,
              }}
              onClick={() => {
                onTaskChange(active ? '' : keyword);
                document.getElementById('models')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <CategoryIcon icon={cat.icon} color={cat.color} />
              <h3 className="insight-name">{cat.name}</h3>
              <div className="insight-leader" style={{ color: cat.color }}>Leader: {cat.leader}</div>
              <p className="insight-text">{cat.insight}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

Delete the `onMouseEnter` / `onMouseLeave` border hacks — CSS hover in Task 4 replaces them. Use `cat.name` as `key`, not the index.

4. In `Home`, add the lifted state next to `activeSection`:

```tsx
  const [task, setTask] = useState('');
  const [maxCost, setMaxCost] = useState<number | null>(null);
```

Render:

```tsx
      <ModelsSection
        task={task}
        maxCost={maxCost}
        onTaskChange={setTask}
        onMaxCostChange={setMaxCost}
      />
```

and

```tsx
      <InsightsSection task={task} onTaskChange={setTask} />
```

Leave Nav, Hero, Leaderboard, OpenWeight, Articles, Footer as they are.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS. Typical failures: `ModelsSection` still referenced without props; leftover `useState` inside `ModelsSection`.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(home): insight cards toggle the model task filter"
```

---

### Task 4: Insight card CSS as a button

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `button.insight-card` and `.insight-card-active` from Task 3.
- Produces: button reset, hover, selected, pointer.

- [ ] **Step 1: Extend `.insight-card`**

Update the existing `.insight-card` rule (keep padding, radius, background, animation) to add button reset + pointer + hover:

```css
.insight-card {
  display: block;
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
  padding: 28px;
  border-radius: 16px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  animation: fadeUp 0.5s both;
  transition: border-color 0.3s, background 0.3s, transform 0.2s;
}

.insight-card:hover {
  transform: translateY(-2px);
  background: rgba(255,255,255,0.04);
}

.insight-card-active {
  background: rgba(255,255,255,0.04);
}
```

Do not change `.insights-grid` columns in this plan.

- [ ] **Step 2: Lint + typecheck**

```bash
npx tsc --noEmit
npx eslint app/page.tsx app/components/ModelFilter.tsx data/recommend.ts --max-warnings=0
```

Expected: PASS.

- [ ] **Step 3: Browser check**

Open `/` at 1440 and 390.

Must be true:

- Clicking **Coding & Engineering** fills the search with `coding`, highlights that chip, marks Fable as Best match, and scrolls to `#models`.
- Clicking the same insight again clears the task (toggle).
- Clicking **Honest Daily Use** sets `honest` and reranks toward Muse.
- Keyboard: Tab to an insight, Enter/Space activates (native button).
- Filter chips and insights stay in sync (same keyword).
- Hover no longer depends on JS `onMouseEnter`.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "style(home): insight cards as filter buttons"
```

---

### Task 5: Plan 04 verification

- [ ] **Step 1: Full gate**

```bash
npx tsc --noEmit
npx jest
npx eslint app/ data/ __tests__/ --max-warnings=0
```

Expected: all green. `rg "split\\(' '\\)\\[0\\]" app/` should have no chip/insight leftovers (Hero/unrelated files may still match — only `ModelFilter` and `InsightsSection` matter).

- [ ] **Step 2: Stop**
