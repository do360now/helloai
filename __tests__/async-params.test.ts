/**
 * Regression guard for the Next.js 15+/16 async `params` contract.
 *
 * In Next.js 15+ the `params` (and `searchParams`) prop passed to page
 * components, `generateMetadata`, and dynamic OG-image components is a
 * `Promise` that MUST be awaited before use. Regressing to the old
 * `params: { slug: string }` shape compiles but yields `params.slug === undefined`
 * at runtime.
 *
 * This test scans every non-API source file under `app/` for a `params:` prop
 * declaration and asserts (a) the type annotation is wrapped in `Promise<` and
 * (b) the file body contains `await params`. API route handlers are excluded —
 * they read `req.nextUrl.searchParams`, which is a different (sync) API.
 */

import * as fs from 'fs';
import * as path from 'path';

const APP_DIR = path.resolve(__dirname, '..', 'app');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// Files that declare `params` as a page/component/metadata prop.
const filesWithParamsProp = walk(APP_DIR)
  .filter((f) => !f.includes(`${path.sep}api${path.sep}`))
  .filter((f) => /params\s*:/.test(fs.readFileSync(f, 'utf8')));

test('at least one file declares a params prop (guard is wired up)', () => {
  expect(filesWithParamsProp.length).toBeGreaterThan(0);
});

describe.each(filesWithParamsProp)('%s', (file) => {
  const src = fs.readFileSync(file, 'utf8');

  test('every params prop is typed as Promise<...>', () => {
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      // Match a `params:` prop declaration, e.g. `  params,` (destructured) or
      // `  params: Promise<{ slug: string }>;`. A bare destructure `params,`
      // is fine — the Promise<> type lives on the surrounding type annotation.
      if (/^\s*params\s*:\s*\S/.test(line)) {
        // An annotation like `params: { slug: string }` (non-Promise) is the bug.
        expect(line).toMatch(/Promise</);
        // Sanity: never match the sync shape directly.
        expect(line).not.toMatch(/params\s*:\s*\{\s*slug/);
      }
    });
  });

  test('file awaits params before reading it', () => {
    expect(src).toMatch(/await\s+params/);
  });
});
