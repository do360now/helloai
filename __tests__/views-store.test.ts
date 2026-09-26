import { getStats, isKnownSlug, recordView, resetViewsForTests, subscribe, broadcast, MAX_PER_OWNER } from '@/lib/views-store';
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
