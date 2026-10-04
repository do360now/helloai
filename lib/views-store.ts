import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { getArticles, getModels } from '@/data';
import { dailyIpDigest } from './api-metrics';
import { classifyUserAgent } from './ua-class';

/**
 * In-process view and presence counters (one Node process per container).
 * Aggregate totals are loaded from the deploy snapshot (`/app/views-baseline.json`,
 * written by scripts/snapshot_views.py) and from `VIEWS_STATE_PATH` when that file
 * is on persistent disk. New views add on top. The higher number wins, so a snapshot
 * and a state file are never summed. Salted daily IP digests stay in memory only —
 * they are not written — so the same visitor can count once more after a restart.
 * Kept on globalThis because the route handlers are bundled separately (same reason
 * as lib/api-metrics.ts).
 * SINGLE INSTANCE ONLY: if App Service scales out, each instance counts on its own.
 * Locally there is no x-forwarded-for, so getClientIp is 'unknown' and views are never
 * counted (viewing still works).
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
const CAP = 1_000_000_000;
export const MAX_SUBSCRIBERS = 5_000;
export const MAX_PER_OWNER = 20;
const BROADCAST_DELAY_MS = 250;
const PERSIST_DELAY_MS = 1_000;
/** home, articles, article/<slug>, model/<id>. Rejects __proto__ and anything else. */
const SLUG_RE = /^(home|articles|article\/[a-z0-9-]{1,120}|model\/[a-z0-9-]{1,40})$/;

interface Carry {
  since: string;
  total: number;
  views: Map<string, number>;
}

interface State {
  since: string;
  date: string;
  views: Map<string, number>;
  total: number;
  carried: boolean;
  seen: Set<string>;
  subs: Set<Subscriber>;
  timer: ReturnType<typeof setTimeout> | null;
  persistTimer: ReturnType<typeof setTimeout> | null;
}

const KEY = '__helloai_views__';
const HOOK = '__helloai_views_hook__';
const g = globalThis as unknown as Record<string, State | boolean | undefined>;
const today = () => new Date().toISOString().slice(0, 10);
const fresh = (): State => ({
  since: new Date().toISOString(),
  date: today(),
  views: new Map(),
  total: 0,
  carried: false,
  seen: new Set(),
  subs: new Set(),
  timer: null,
  persistTimer: null,
});

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

function baselinePath(): string | null {
  const fromEnv = process.env.VIEWS_BASELINE_FILE?.trim();
  if (fromEnv) return fromEnv;
  const baked = '/app/views-baseline.json';
  return existsSync(baked) ? baked : null;
}

function persistPath(): string | null {
  const p = process.env.VIEWS_STATE_PATH?.trim();
  return p || null;
}

function parseCarry(raw: string): Carry | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const o = data as Record<string, unknown>;
  if (typeof o.total !== 'number' || !Number.isInteger(o.total) || o.total < 0 || o.total > CAP) return null;
  if (typeof o.since !== 'string' || Number.isNaN(Date.parse(o.since))) return null;
  if (!o.views || typeof o.views !== 'object' || Array.isArray(o.views)) return null;
  const views = new Map<string, number>();
  for (const key of Object.keys(o.views as object)) {
    if (!SLUG_RE.test(key)) continue;
    const v = (o.views as Record<string, unknown>)[key];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > CAP) continue;
    views.set(key, v);
  }
  return { since: new Date(o.since).toISOString(), total: o.total, views };
}

function readCarryFile(path: string): Carry | null {
  try {
    if (!existsSync(path)) return null;
    return parseCarry(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function readCarries(): Carry[] {
  const out: Carry[] = [];
  const base = baselinePath();
  if (base) {
    const c = readCarryFile(base);
    if (c) out.push(c);
  }
  const state = persistPath();
  if (state && state !== base) {
    const c = readCarryFile(state);
    if (c) out.push(c);
  }
  const env = process.env.VIEWS_BASELINE?.trim();
  if (env) {
    const c = parseCarry(env);
    if (c) out.push(c);
  }
  return out;
}

function peak(views: Map<string, number>): number {
  let m = 0;
  for (const n of views.values()) if (n > m) m = n;
  return m;
}

function carried(part: Carry): boolean {
  return part.total > 0 || [...part.views.values()].some((n) => n > 0);
}

/** Highest total and per-slug count. Snapshots of the same counter must not be added. */
function mergeCarry(parts: Carry[]): Carry & { carried: boolean } | null {
  if (parts.length === 0) return null;
  const dated = parts.filter(carried);
  const clock = dated.length > 0 ? dated : parts;
  let since = clock[0].since;
  let total = 0;
  const views = new Map<string, number>();
  for (const p of clock) if (p.since < since) since = p.since;
  for (const p of parts) {
    if (p.total > total) total = p.total;
    for (const [k, n] of p.views) if (n > (views.get(k) ?? 0)) views.set(k, n);
  }
  const top = peak(views);
  if (top > total) total = top;
  return { since, total, views, carried: total > 0 };
}

function absorb(s: State, disk: Carry): void {
  if (carried(disk) && disk.since < s.since) s.since = disk.since;
  if (disk.total > s.total) s.total = disk.total;
  for (const [k, n] of disk.views) if (n > (s.views.get(k) ?? 0)) s.views.set(k, n);
  const top = peak(s.views);
  if (top > s.total) s.total = top;
  if (s.total > 0) s.carried = true;
}

function loadState(): State {
  const s = fresh();
  const merged = mergeCarry(readCarries());
  if (merged?.carried) {
    s.since = merged.since;
    s.total = merged.total;
    s.views = merged.views;
    s.carried = true;
  }
  return s;
}

let warnedPersist = false;

function persistNow(): void {
  const path = persistPath();
  const s = g[KEY];
  if (!path || !s || typeof s === 'boolean') return;
  const disk = readCarryFile(path);
  if (disk) absorb(s, disk);
  const views: Record<string, number> = {};
  for (const key of [...s.views.keys()].sort()) views[key] = s.views.get(key) ?? 0;
  const body = JSON.stringify({ since: s.since, total: s.total, views });
  try {
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.${process.pid}.tmp`;
    writeFileSync(tmp, `${body}\n`);
    renameSync(tmp, path);
  } catch (err) {
    if (!warnedPersist) {
      warnedPersist = true;
      console.warn('[views] could not save counts:', err instanceof Error ? err.message : err);
    }
  }
}

function armShutdownHook(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  if (!persistPath() || g[HOOK]) return;
  g[HOOK] = true;
  const flushAndExit = () => {
    try {
      persistNow();
    } catch {
      /* persistNow already logs */
    }
    process.exit(0);
  };
  process.once('SIGTERM', flushAndExit);
  process.once('SIGINT', flushAndExit);
}

const st = (): State => {
  const cur = g[KEY];
  if (cur && typeof cur !== 'boolean') return cur;
  const created = loadState();
  g[KEY] = created;
  armShutdownHook();
  return created;
};

function schedulePersist(): void {
  const s = st();
  if (!persistPath() || s.persistTimer) return;
  s.persistTimer = setTimeout(() => {
    s.persistTimer = null;
    persistNow();
  }, PERSIST_DELAY_MS);
  s.persistTimer.unref?.();
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
  if (counted) {
    scheduleBroadcast();
    schedulePersist();
  }
  return counted ? 'counted' : 'duplicate';
}

export function viewsSince(): string {
  return st().since;
}

export function viewsCarried(): boolean {
  return st().carried;
}

export function resetViewsForTests(): void {
  const s = g[KEY];
  if (s && typeof s !== 'boolean') {
    if (s.timer) clearTimeout(s.timer);
    if (s.persistTimer) clearTimeout(s.persistTimer);
  }
  g[KEY] = fresh();
}

/** Drop in-memory state so the next read loads the baseline and state files again. */
export function reloadViewsForTests(): void {
  const s = g[KEY];
  if (s && typeof s !== 'boolean') {
    if (s.timer) clearTimeout(s.timer);
    if (s.persistTimer) clearTimeout(s.persistTimer);
  }
  g[KEY] = undefined;
}

export function flushViewsForTests(): void {
  const s = g[KEY];
  if (s && typeof s !== 'boolean' && s.persistTimer) {
    clearTimeout(s.persistTimer);
    s.persistTimer = null;
  }
  persistNow();
}
