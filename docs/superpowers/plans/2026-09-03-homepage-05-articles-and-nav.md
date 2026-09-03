# Articles Shelf and Site Nav Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show only the latest three dispatches on the homepage, and put the real site nav on `/articles` and `/articles/[slug]`.

**Architecture:** `getHomepageArticles()` slices the already date-desc `getArticles()` list. Homepage renders that slice plus an `All dispatches →` link. `Nav` uses `usePathname()` so brand always goes `/` and section links are `#id` on home, `/#id` elsewhere. Article routes import the same `Nav`. Mobile menu becomes a covering overlay with `aria-expanded`.

**Tech Stack:** Next.js App Router, `next/link`, `next/navigation` (`usePathname`), Jest data tests.

**Spec:** `docs/superpowers/specs/2026-09-03-homepage-design-evolution-design.md` § Decision 5.

## Global Constraints

- Repo root: `/home/cmc/git/grok/helloai`.
- Do not paginate `/articles`; it remains the full list.
- Do not remove the article page back-link; Nav is additional.
- `HOMEPAGE_ARTICLE_COUNT` is exactly `3`.
- Homepage `ArticlesSection` must not map `getArticles()` in full after this plan.
- Commit after every task. Do not push or deploy.

---

### Task 1: `getHomepageArticles`

**Files:**
- Modify: `data/index.ts`
- Modify: `__tests__/data.test.ts`

**Interfaces:**
- Consumes: `getArticles()` date-desc order (already Jest-enforced).
- Produces:
  - `export const HOMEPAGE_ARTICLE_COUNT = 3`
  - `export function getHomepageArticles(): Article[]` — `getArticles().slice(0, HOMEPAGE_ARTICLE_COUNT)`

- [ ] **Step 1: Write the failing tests**

In `__tests__/data.test.ts`, extend the import:

```ts
import { getSiteConfig, getModels, getCategories, getArticles, getArticleBySlug, getHomepageArticles, HOMEPAGE_ARTICLE_COUNT } from '../data';
```

Inside `describe('Articles', ...)`, after the date-desc test, add:

```ts
  test('HOMEPAGE_ARTICLE_COUNT is 3', () => {
    expect(HOMEPAGE_ARTICLE_COUNT).toBe(3);
  });

  test('getHomepageArticles returns the newest three', () => {
    const home = getHomepageArticles();
    const all = getArticles();
    expect(home).toHaveLength(Math.min(3, all.length));
    expect(home.map((a) => a.slug)).toEqual(all.slice(0, 3).map((a) => a.slug));
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/data.test.ts -t Homepage`

Expected: FAIL — `getHomepageArticles` / `HOMEPAGE_ARTICLE_COUNT` not exported.

- [ ] **Step 3: Implement**

In `data/index.ts`, after `getArticles`:

```ts
export const HOMEPAGE_ARTICLE_COUNT = 3;

export const getHomepageArticles = (): Article[] =>
  getArticles().slice(0, HOMEPAGE_ARTICLE_COUNT);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/data.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data/index.ts __tests__/data.test.ts
git commit -m "feat(data): homepage article shelf is the newest three"
```

---

### Task 2: Homepage shelf + “All dispatches”

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `getHomepageArticles` from `@/data`.
- Produces: `ArticlesSection` maps `homepageArticles` (length 3) and a `.articles-more` link to `/articles`.

- [ ] **Step 1: Switch the data source**

In `app/page.tsx` change the `@/data` import to include `getHomepageArticles` (you may drop `getArticles` from this file if nothing else uses it).

Replace:

```ts
const articles = getArticles();
```

with:

```ts
const homepageArticles = getHomepageArticles();
```

In `ArticlesSection`, map `homepageArticles` instead of `articles`, and after the grid add:

```tsx
        <div className="articles-more-wrap">
          <a href="/articles" className="articles-more">All dispatches →</a>
        </div>
```

Keep the section `id="articles"` and the existing `SectionHeader` (title `Dispatches from the frontier`).

- [ ] **Step 2: Style the more-link**

In `app/globals.css` after `.articles-grid`, add:

```css
.articles-more-wrap {
  margin-top: 32px;
  text-align: center;
}

.articles-more {
  font-family: 'JetBrains Mono', var(--font-geist-mono), monospace;
  font-size: 13px;
  font-weight: 600;
  color: #00E5A0;
  text-decoration: none;
  letter-spacing: 0.04em;
}

.articles-more:hover { color: #5EEAD4; }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS. If `getArticles` is an unused import, remove it.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat(home): show three dispatches plus all-articles link"
```

---

### Task 3: Nav works off the homepage

**Files:**
- Modify: `app/components/Nav.tsx`
- Modify: `app/globals.css` (mobile overlay)
- Modify: `app/articles/page.tsx`
- Modify: `app/articles/[slug]/page.tsx`

**Interfaces:**
- Consumes: `usePathname()` from `next/navigation`; `Link` from `next/link`.
- Produces: `Nav({ activeSection?: string })`. Brand is `<Link href="/">`. `hrefFor(id)` is `#${id}` when `pathname === '/'`, otherwise `/#${id}`. Hamburger has `aria-expanded` and `aria-controls="nav-mobile-menu"`. Mobile menu is `#nav-mobile-menu` and covers the page.

- [ ] **Step 1: Rewrite `Nav.tsx`**

Overwrite `app/components/Nav.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = ['models', 'leaderboard', 'local', 'insights', 'articles'] as const;

export default function Nav({ activeSection = '' }: { activeSection?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const onHome = pathname === '/';
  const hrefFor = (id: string) => (onHome ? `#${id}` : `/#${id}`);

  return (
    <nav className="nav">
      <Link href="/" className="nav-brand" onClick={() => setMenuOpen(false)}>
        <span className="nav-logo">hello</span>
        <span className="nav-badge">AI</span>
      </Link>

      <div className="nav-links-desktop">
        {NAV_LINKS.map((s) => (
          <a
            key={s}
            href={hrefFor(s)}
            className={`nav-link ${activeSection === s ? 'nav-link-active' : ''}`}
          >
            {s}
          </a>
        ))}
      </div>

      <button
        className="nav-hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        aria-controls="nav-mobile-menu"
      >
        <span className={`hamburger-line ${menuOpen ? 'hamburger-open-1' : ''}`} />
        <span className={`hamburger-line ${menuOpen ? 'hamburger-open-2' : ''}`} />
        <span className={`hamburger-line ${menuOpen ? 'hamburger-open-3' : ''}`} />
      </button>

      {menuOpen && (
        <div id="nav-mobile-menu" className="nav-mobile-menu">
          {NAV_LINKS.map((s) => (
            <a
              key={s}
              href={hrefFor(s)}
              className={`nav-mobile-link ${activeSection === s ? 'nav-link-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {s}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
```

`.nav-brand` was a `div`; it is now a `Link`. CSS already has `.nav-brand { display: flex; align-items: center; gap: 8px; }` — add `text-decoration: none; color: inherit;` in Task 3 CSS so the logo does not underline.

- [ ] **Step 2: Brand + mobile overlay CSS**

Add to the nav block in `app/globals.css`:

```css
a.nav-brand { text-decoration: none; color: inherit; }
```

Replace `.nav-mobile-menu` so it actually covers content (it is `display: none` on desktop and `display: block` under 768px — keep that media-query pair). Update the rule itself to:

```css
.nav-mobile-menu {
  display: none;
  position: absolute;
  top: 64px;
  left: 0;
  right: 0;
  background: rgba(8,10,18,0.97);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  padding: 16px 24px;
  z-index: 101;
}
```

The important change is the near-opaque background (`0.97`) and `z-index: 101` so article cards cannot show through.

- [ ] **Step 3: Mount Nav on article routes**

In `app/articles/page.tsx`, add:

```ts
import Nav from '../components/Nav';
```

and as the first child inside the outer wrapper (before the back link):

```tsx
      <Nav activeSection="articles" />
```

In `app/articles/[slug]/page.tsx`, add:

```ts
import Nav from '../../components/Nav';
```

and as the first child of `<article className="article-page">` (before the JSON-LD script is fine, or immediately after it; visually it must be in the tree):

```tsx
      <Nav />
```

Article pages already pad `120px` from the top — do not add extra padding.

- [ ] **Step 4: Typecheck + lint**

```bash
npx tsc --noEmit
npx eslint app/components/Nav.tsx app/articles/page.tsx app/articles/\[slug\]/page.tsx app/page.tsx --max-warnings=0
```

Expected: PASS.

- [ ] **Step 5: Browser check**

Must be true:

- `/` still has one nav. Brand click keeps you on `/` (or reloads home).
- `/#articles` shows **three** article cards and `All dispatches →`. That link goes to `/articles`.
- `/articles` lists every article (currently 10) **and** shows the site nav. Brand returns home. `MODELS` goes to `/#models`.
- `/articles/<latest-slug>` shows the site nav; `ARTICLES` hash from here lands on `/#articles`. Back-link still works.
- Mobile 390: hamburger `aria-expanded` flips; open menu fully covers the page content (no article titles bleeding through).

- [ ] **Step 6: Commit**

```bash
git add app/components/Nav.tsx app/globals.css app/articles/page.tsx app/articles/[slug]/page.tsx
git commit -m "feat: site nav on article routes; homepage article shelf"
```

If the articles-page commit from Task 2 already landed, this commit is nav-only — that is fine; do not amend.

---

### Task 4: Plan 05 verification

- [ ] **Step 1: Full gate**

```bash
npx tsc --noEmit
npx jest
npx eslint app/ data/ __tests__/ --max-warnings=0
```

Expected: all green.

- [ ] **Step 2: Confirm the homepage no longer dumps the archive**

```bash
rg -n "getArticles\\(\\)" app/page.tsx
```

Expected: no matches (homepage uses `getHomepageArticles` only). `app/articles/**` and `app/sitemap.ts` still call `getArticles()`.

- [ ] **Step 3: Stop**
