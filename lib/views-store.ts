import { getArticles, getModels } from '@/data';
import { dailyIpDigest } from './api-metrics';
import { classifyUserAgent } from './ua-class';

/**
 * In-process view and presence counters (one Node process per container).
 * Views are all-time only until the next restart or deploy; `since` says when the clock started.
 * Only the salted daily digest of an IP is held, never the IP. Kept on globalThis because
 * the route handlers are bundled separately (same reason as lib/api-metrics.ts).
 * SINGLE INSTANCE ONLY: if App Service scales out, each instance counts on its own. Locally there is
 * no x-forwarded-for, so getClientIp is 'unknown' and views are never counted (viewing still works).
 */
export interface ViewStats {
  slug: string;
  views: number;
  viewing: number;
  total: number;
  viewing_total: number;
}

export interface Subscriber {
  slug: string;
  /** Counts toward `viewing`. Only the site-wide header counter sets it, so one tab counts once. */
  presence: boolean;
  /** Daily IP digest (or 'unknown'); caps how many streams one client can hold open. */
  owner: string;
  send: (stats: ViewStats) => void;
}

const MAX_SEEN = 200_000;
export const MAX_SUBSCRIBERS = 5_000;
export const MAX_PER_OWNER = 20;
const BROADCAST_DELAY_MS = 250;

interface State {
  since: string;
  date: string;
  views: Map<string, number>;
  total: number;
  seen: Set<string>;
  subs: Set<Subscriber>;
  timer: ReturnType<typeof setTimeout> | null;
}

const KEY = '__helloai_views__';
const g = globalThis as unknown as Record<string, State | undefined>;
const today = () => new Date().toISOString().slice(0, 10);
const fresh = (): State => ({
  since: new Date().toISOString(),
  date: today(),
  views: new Map(),
  total: 0,
  seen: new Set(),
  subs: new Set(),
  timer: null,
});
const st = (): State => (g[KEY] ??= fresh());

let known: Set<string> | null = null;
/** Only slugs we serve are counted, so a caller cannot grow the maps with arbitrary strings. */
export function isKnownSlug(slug: string): boolean {
  known ??= new Set([
    'home',
    'articles',
    ...getArticles().map((a) => `article/${a.slug}`),
    ...getModels().map((m) => `model/${m.id}`),
  ]);
  return known.has(slug);
}

interface Presence {
  bySlug: Map<string, number>;
  total: number;
}

function presenceCounts(): Presence {
  const bySlug = new Map<string, number>();
  let total = 0;
  for (const sub of st().subs) {
    if (!sub.presence) continue;
    total++;
    bySlug.set(sub.slug, (bySlug.get(sub.slug) ?? 0) + 1);
  }
  return { bySlug, total };
}

function statsFrom(slug: string, p: Presence): ViewStats {
  const s = st();
  return { slug, views: s.views.get(slug) ?? 0, viewing: p.bySlug.get(slug) ?? 0, total: s.total, viewing_total: p.total };
}

export function getStats(slug: string): ViewStats {
  return statsFrom(slug, presenceCounts());
}

export function broadcast(): void {
  const s = st();
  s.timer = null;
  const p = presenceCounts(); // one pass per broadcast, not one per subscriber
  for (const sub of [...s.subs]) {
    try {
      sub.send(statsFrom(sub.slug, p));
    } catch {
      s.subs.delete(sub);
    }
  }
}

function scheduleBroadcast(): void {
  const s = st();
  if (s.timer) return;
  s.timer = setTimeout(broadcast, BROADCAST_DELAY_MS);
  s.timer.unref?.();
}

/** Returns an unsubscribe function, or null when the store or this owner is at capacity. */
export function subscribe(sub: Subscriber): (() => void) | null {
  const s = st();
  if (s.subs.size >= MAX_SUBSCRIBERS) return null;
  let mine = 0;
  for (const other of s.subs) if (other.owner === sub.owner) mine++;
  if (mine >= MAX_PER_OWNER) return null;
  s.subs.add(sub);
  scheduleBroadcast();
  return () => {
    if (s.subs.delete(sub)) scheduleBroadcast();
  };
}

export type RecordResult = 'counted' | 'duplicate' | 'skipped';

/**
 * Count one view of `slug` from `ip`: at most once per IP per UTC day per slug, and once per
 * IP per day toward the site total. Only browsers count (bots are skipped). Skips, never
 * counts, when the IP is unknown or no salt is configured in production.
 */
export function recordView(slug: string, ip: string, userAgent: string): RecordResult {
  if (!isKnownSlug(slug) || ip === 'unknown') return 'skipped';
  if (classifyUserAgent(userAgent) !== 'browser') return 'skipped';
  const digest = dailyIpDigest(ip);
  if (!digest) return 'skipped';
  const s = st();
  if (s.date !== today()) {
    s.date = today();
    s.seen.clear();
  }
  if (s.seen.size >= MAX_SEEN) return 'skipped';
  let counted = false;
  const totalKey = `total:${digest}`;
  if (!s.seen.has(totalKey)) {
    s.seen.add(totalKey);
    s.total++;
    counted = true;
  }
  const slugKey = `${slug}:${digest}`;
  if (!s.seen.has(slugKey)) {
    s.seen.add(slugKey);
    s.views.set(slug, (s.views.get(slug) ?? 0) + 1);
    counted = true;
  }
  if (counted) scheduleBroadcast();
  return counted ? 'counted' : 'duplicate';
}

export function viewsSince(): string {
  return st().since;
}

export function resetViewsForTests(): void {
  const s = g[KEY];
  if (s?.timer) clearTimeout(s.timer);
  g[KEY] = fresh();
}
