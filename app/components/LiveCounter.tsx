'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { viewsSinceTitle } from '@/lib/views-since';

interface Stats {
  views: number;
  viewing: number;
  total: number;
  viewing_total: number;
}

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const fmt = (n: number) => (n < 1000 ? n.toLocaleString('en-US') : compact.format(n));

// Cards on one page share a single GET /api/views?slugs=… instead of one request each.
const viewCache = new Map<string, { views: number; at: number }>();
const CACHE_MS = 30_000;
let pending = new Map<string, Array<(v: number | null) => void>>();
let scheduled = false;

function fetchViews(slug: string): Promise<number | null> {
  const hit = viewCache.get(slug);
  if (hit && Date.now() - hit.at < CACHE_MS) return Promise.resolve(hit.views);
  return new Promise((resolve) => {
    pending.set(slug, [...(pending.get(slug) ?? []), resolve]);
    if (scheduled) return;
    scheduled = true;
    setTimeout(async () => {
      const batch = pending;
      pending = new Map();
      scheduled = false;
      try {
        const res = await fetch(`/api/views?slugs=${[...batch.keys()].map(encodeURIComponent).join(',')}`);
        const data = res.ok ? ((await res.json()) as { stats: Record<string, number> }) : null;
        for (const [s, waiters] of batch) {
          const v = data?.stats[s];
          if (typeof v === 'number') viewCache.set(s, { views: v, at: Date.now() });
          for (const w of waiters) w(typeof v === 'number' ? v : null);
        }
      } catch {
        for (const waiters of batch.values()) for (const w of waiters) w(null);
      }
    }, 0);
  });
}

// One stream per tab, opened by the header counter. The article page reads the same events
// (they carry per-slug views and viewing) instead of opening a second connection.
let siteStats: (Stats & { slug: string; since?: string; carried?: boolean }) | null = null;
const siteListeners = new Set<() => void>();
function setSiteStats(next: typeof siteStats) {
  siteStats = next;
  siteListeners.forEach((l) => l());
}

function useSiteStats(): typeof siteStats {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    siteListeners.add(l);
    return () => void siteListeners.delete(l);
  }, []);
  return siteStats;
}

/** Records the page view and holds the presence stream for `slug`. Any error hides the counters. */
function useSiteStream(slug: string | null) {
  useEffect(() => {
    if (!slug) return;
    let es: EventSource | null = null;
    let dead = false;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    (async () => {
      try {
        await fetch('/api/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        });
        if (dead) return;
        es = new EventSource(`/api/views/stream?slug=${encodeURIComponent(slug)}&presence=1`);
        es.addEventListener('stats', (e) => {
          if (hideTimer) clearTimeout(hideTimer);
          hideTimer = null;
          try {
            setSiteStats(JSON.parse((e as MessageEvent<string>).data));
          } catch {
            setSiteStats(null);
          }
        });
        // The server recycles each stream every 2 minutes and EventSource reconnects within ~1s, so
        // hide only if no event arrives within 5s. A real outage or deploy restart still hides the count.
        es.onerror = () => {
          hideTimer ??= setTimeout(() => setSiteStats(null), 5000);
        };
      } catch {
        setSiteStats(null);
      }
    })();
    return () => {
      dead = true;
      if (hideTimer) clearTimeout(hideTimer);
      es?.close(); // the server sees the abort and drops this viewer
      setSiteStats(null);
    };
  }, [slug]);
}

function useViews(slug: string, enabled: boolean): number | null {
  const [views, setViews] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let dead = false;
    fetchViews(slug).then((v) => !dead && setViews(v));
    return () => {
      dead = true;
    };
  }, [slug, enabled]);
  return views;
}

/**
 * Counts hide (visibility, not display) until data arrives or if the API fails, so
 * the reserved space never shifts the layout.
 *  - variant="site": header counter. Records the current page view, counts this tab as a
 *    viewer, shows site-wide `viewing` and total `views`. `slug` is ignored; the route decides.
 *  - variant="page": live `viewing` and `views` for `slug` (article detail). Records nothing.
 *  - variant="views": `views` only, fetched once (cards). `noun` renames it, e.g. "clicks".
 */
export default function LiveCounter({
  slug,
  variant = 'page',
  noun = 'views',
  lead = '',
}: {
  slug: string;
  variant?: 'site' | 'page' | 'views';
  noun?: string;
  /** Text shown before the count and hidden with it, e.g. a separator. */
  lead?: string;
}) {
  const pathname = usePathname();
  // Only pages we count. A new kind of page must be added here and to isKnownSlug, not fall into 'articles'.
  const siteSlug =
    pathname === '/' ? 'home' : pathname === '/articles' ? 'articles' : /^\/articles\/[^/]+$/.test(pathname) ? `article/${pathname.split('/')[2]}` : null;
  useSiteStream(variant === 'site' ? siteSlug : null);
  const site = useSiteStats();
  const cardViews = useViews(slug, variant === 'views');

  if (variant === 'views') {
    return (
      <span className="live-counter live-counter-inline" style={{ visibility: cardViews === null ? 'hidden' : 'visible' }}>
        {lead}<b>{fmt(cardViews ?? 0)}</b> {noun}
      </span>
    );
  }
  // `page` shows this slug's own numbers, and only while the tab's stream is for that slug.
  const live = variant === 'site' ? site : site?.slug === slug ? site : null;
  const viewing = variant === 'site' ? live?.viewing_total : live?.viewing;
  const views = variant === 'site' ? live?.total : live?.views;
  const since = live?.since ? viewsSinceTitle(live.since, live.carried === true) : undefined;
  return (
    <span
      className={`live-counter live-counter-${variant}`}
      style={{ visibility: live ? 'visible' : 'hidden' }}
      title={since}
    >
      <span className="live-dot" aria-hidden="true" />
      <b>{fmt(viewing ?? 0)}</b> viewing <b>{fmt(views ?? 0)}</b> {noun}
    </span>
  );
}
