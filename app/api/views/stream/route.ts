import { NextRequest, NextResponse } from 'next/server';
import { dailyIpDigest } from '@/lib/api-metrics';
import { getClientIp } from '@/lib/client-ip';
import { classifyUserAgent } from '@/lib/ua-class';
import { getStats, isKnownSlug, subscribe, viewsSince } from '@/lib/views-store';

export const dynamic = 'force-dynamic';

let warnedUnknownOwner = false;
const HEARTBEAT_MS = 15_000;
// Bounds a ghost viewer if the front end never passes a disconnect through; EventSource
// reconnects on its own and the retry below keeps the gap under a second.
const MAX_LIFETIME_MS = 2 * 60_000;

/**
 * GET ?slug=home[&presence=1] -> text/event-stream of stats. `presence=1` (browsers only)
 * counts this connection as a viewer until it closes (tab close aborts the request), a
 * heartbeat write fails, or the lifetime cap is hit. Refusals are real HTTP errors
 * (403/404/503) because EventSource stops for good on a non-200 instead of retrying.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  if (!isKnownSlug(slug)) return NextResponse.json({ error: 'unknown slug' }, { status: 404 });
  const presence = req.nextUrl.searchParams.get('presence') === '1';
  if (presence && classifyUserAgent(req.headers.get('user-agent') ?? '') !== 'browser') {
    return NextResponse.json({ error: 'presence is for browsers' }, { status: 403 });
  }
  const ip = getClientIp(req.headers);
  const owner = (ip === 'unknown' ? null : dailyIpDigest(ip)) ?? 'unknown';
  if (owner === 'unknown' && process.env.NODE_ENV === 'production' && !warnedUnknownOwner) {
    // Every such client shares one owner cap, so viewing tops out and later visitors get 503s.
    warnedUnknownOwner = true;
    console.warn('[views] client IP or METRICS_SALT unavailable in production; check TRUSTED_PROXY_HOPS and METRICS_SALT');
  }
  const enc = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const write = (chunk: string) => controller.enqueue(enc.encode(chunk));
  const unsubscribe = subscribe({
    slug,
    presence,
    owner,
    send: (stats) => write(`event: stats\ndata: ${JSON.stringify({ ...stats, since: viewsSince() })}\n\n`),
  });
  if (!unsubscribe) return NextResponse.json({ error: 'too many streams' }, { status: 503, headers: { 'Retry-After': '30' } });

  let closed = false;
  let heartbeat: ReturnType<typeof setInterval>;
  let lifetime: ReturnType<typeof setTimeout>;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    clearTimeout(lifetime);
    unsubscribe();
    try {
      controller.close();
    } catch {
      /* already closed */
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      heartbeat = setInterval(() => {
        try {
          write(': ping\n\n');
        } catch {
          cleanup();
        }
      }, HEARTBEAT_MS);
      lifetime = setTimeout(cleanup, MAX_LIFETIME_MS);
      req.signal.addEventListener('abort', cleanup);
      write('retry: 1000\n\n');
      write(`event: stats\ndata: ${JSON.stringify({ ...getStats(slug), since: viewsSince() })}\n\n`);
    },
    cancel: cleanup,
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
