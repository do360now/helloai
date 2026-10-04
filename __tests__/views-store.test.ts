import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { flushViewsForTests, getStats, isKnownSlug, recordView, reloadViewsForTests, resetViewsForTests, subscribe, broadcast, viewsCarried, viewsSince, MAX_PER_OWNER } from '@/lib/views-store';
import { viewsSinceTitle } from '@/lib/views-since';
import { getArticles, getModels } from '@/data';

const BROWSER = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const article = `article/${getArticles()[0].slug}`;

beforeEach(() => resetViewsForTests());
afterAll(() => resetViewsForTests());

describe('recordView', () => {
  test('counts once per IP per day per slug and once toward the total', () => {
    expect(recordView('home', '203.0.113.1', BROWSER)).toBe('counted');
    expect(recordView('home', '203.0.113.1', BROWSER)).toBe('duplicate');
    expect(recordView(article, '203.0.113.1', BROWSER)).toBe('counted'); // new slug, same IP
    expect(getStats('home')).toMatchObject({ views: 1, total: 1 });
    expect(getStats(article)).toMatchObject({ views: 1, total: 1 });
    recordView('home', '203.0.113.2', BROWSER);
    expect(getStats('home')).toMatchObject({ views: 2, total: 2 });
  });
  test('skips bots, curl, unknown IPs and unknown slugs', () => {
    expect(recordView('home', '203.0.113.3', 'Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe('skipped');
    expect(recordView('home', '203.0.113.3', 'curl/8.5')).toBe('skipped');
    expect(recordView('home', 'unknown', BROWSER)).toBe('skipped');
    expect(recordView('nope', '203.0.113.3', BROWSER)).toBe('skipped');
    expect(getStats('home').total).toBe(0);
  });
  test('never holds the raw IP', () => {
    recordView('home', '203.0.113.77', BROWSER);
    const s = (globalThis as unknown as Record<string, { seen: Set<string> }>)['__helloai_views__'];
    expect([...s.seen].some((k) => k.includes('203.0.113.77'))).toBe(false);
  });
  test('fails closed in production without METRICS_SALT', () => {
    const env = process.env as Record<string, string | undefined>;
    const [nodeEnv, salt] = [env.NODE_ENV, env.METRICS_SALT];
    env.NODE_ENV = 'production';
    delete env.METRICS_SALT;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(recordView('home', '203.0.113.4', BROWSER)).toBe('skipped');
    } finally {
      env.NODE_ENV = nodeEnv;
      if (salt !== undefined) env.METRICS_SALT = salt;
      jest.restoreAllMocks();
    }
  });
});

describe('slugs', () => {
  test('home, articles, every article and every model are known; others are not', () => {
    expect(isKnownSlug('home')).toBe(true);
    expect(isKnownSlug(article)).toBe(true);
    expect(isKnownSlug(`model/${getModels()[0].id}`)).toBe(true);
    expect(isKnownSlug('article/does-not-exist')).toBe(false);
    expect(isKnownSlug('__proto__')).toBe(false);
  });
});

describe('carry forward', () => {
  const env = process.env as Record<string, string | undefined>;
  let dir = '';
  const baseline = () => join(dir, 'baseline.json');
  const state = () => join(dir, 'state.json');

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'helloai-views-'));
    env.VIEWS_BASELINE_FILE = baseline();
    env.VIEWS_STATE_PATH = state();
    delete env.VIEWS_BASELINE;
  });
  afterEach(() => {
    delete env.VIEWS_BASELINE_FILE;
    delete env.VIEWS_STATE_PATH;
    delete env.VIEWS_BASELINE;
    rmSync(dir, { recursive: true, force: true });
    resetViewsForTests();
  });

  test('starts from the saved totals, adds a new view, and does not store the IP', () => {
    writeFileSync(baseline(), JSON.stringify({
      since: '2026-09-01T00:00:00.000Z',
      total: 10,
      views: { home: 7, 'article/kept': 4 },
    }));
    reloadViewsForTests();
    expect(viewsCarried()).toBe(true);
    expect(viewsSince()).toBe('2026-09-01T00:00:00.000Z');
    expect(getStats('home')).toMatchObject({ views: 7, total: 10 });
    expect(getStats('article/kept').views).toBe(4);
    expect(recordView('home', '203.0.113.9', BROWSER)).toBe('counted');
    flushViewsForTests();
    const saved = JSON.parse(readFileSync(state(), 'utf8')) as { since: string; total: number; views: Record<string, number>; seen?: unknown };
    expect(saved).toMatchObject({ since: '2026-09-01T00:00:00.000Z', total: 11, views: { home: 8, 'article/kept': 4 } });
    expect(saved.seen).toBeUndefined();
    expect(JSON.stringify(saved)).not.toContain('203.0.113.9');
    reloadViewsForTests();
    expect(getStats('home')).toMatchObject({ views: 8, total: 11 });
    // The digest was not saved, so this visitor can count once more after a reload.
    expect(recordView('home', '203.0.113.9', BROWSER)).toBe('counted');
    expect(getStats('home').views).toBe(9);
  });

  test('keeps the higher snapshot and ignores a lower or corrupt file', () => {
    writeFileSync(baseline(), JSON.stringify({ since: '2026-09-01T00:00:00.000Z', total: 10, views: { home: 7 } }));
    writeFileSync(state(), '{"since":"2026-10-01T00:00:00.000Z","total":3,"views":{"home":1,"__proto__":99,"nope":5}}');
    reloadViewsForTests();
    expect(getStats('home')).toMatchObject({ views: 7, total: 10 });
    expect(viewsSince()).toBe('2026-09-01T00:00:00.000Z');

    writeFileSync(baseline(), '{');
    writeFileSync(state(), JSON.stringify({ since: '1970-01-01T00:00:00.000Z', total: 0, views: {} }));
    env.VIEWS_BASELINE = JSON.stringify({ since: '2026-09-26T21:04:20.986Z', total: 230, views: { home: 190 } });
    reloadViewsForTests();
    expect(viewsCarried()).toBe(true);
    expect(viewsSince()).toBe('2026-09-26T21:04:20.986Z');
    expect(getStats('home')).toMatchObject({ views: 190, total: 230 });
  });
});

describe('views since title', () => {
  test('names the carry when totals were loaded', () => {
    const when = new Date('2026-09-26T21:04:20.986Z').toUTCString();
    expect(viewsSinceTitle('2026-09-26T21:04:20.986Z', true)).toBe(`Counted since ${when}. Totals are kept when the site is redeployed`);
    expect(viewsSinceTitle('2026-09-26T21:04:20.986Z', false)).toBe(`Counted since ${when}; resets when the site restarts`);
  });
});

describe('presence', () => {
  test('only presence subscribers count as viewing, and unsubscribing drops them', () => {
    const a = subscribe({ slug: 'home', presence: true, owner: 'o', send: () => {} })!;
    const b = subscribe({ slug: 'home', presence: true, owner: 'o', send: () => {} })!;
    subscribe({ slug: 'home', presence: false, owner: 'o', send: () => {} }); // watcher
    expect(getStats('home')).toMatchObject({ viewing: 2, viewing_total: 2 });
    a();
    expect(getStats('home').viewing).toBe(1);
    b();
    expect(getStats('home').viewing_total).toBe(0);
  });
  test('broadcast pushes each subscriber its own slug stats and drops ones that throw', () => {
    const got: number[] = [];
    subscribe({ slug: article, presence: false, owner: 'o', send: (s) => got.push(s.views) });
    subscribe({ slug: 'home', presence: true, owner: 'o', send: () => { throw new Error('closed'); } });
    recordView(article, '203.0.113.5', BROWSER);
    broadcast();
    expect(got.at(-1)).toBe(1);
    expect(getStats('home').viewing).toBe(0);
  });
  test('one owner cannot hold more than MAX_PER_OWNER streams; others are unaffected', () => {
    for (let i = 0; i < MAX_PER_OWNER; i++) expect(subscribe({ slug: 'home', presence: true, owner: 'hog', send: () => {} })).not.toBeNull();
    expect(subscribe({ slug: 'home', presence: true, owner: 'hog', send: () => {} })).toBeNull();
    expect(subscribe({ slug: 'home', presence: true, owner: 'other', send: () => {} })).not.toBeNull();
  });
});
