import { NextRequest, NextResponse } from 'next/server';
import { apiHeaders } from '@/lib/api';
import { getCorsHeaders } from '@/lib/cors';
import { getClientIp } from '@/lib/client-ip';
import { getStats, isKnownSlug, recordView, viewsCarried, viewsSince } from '@/lib/views-store';

export const dynamic = 'force-dynamic';

const MAX_BATCH = 50;

/** GET ?slug=home -> stats for one slug. GET ?slugs=a,b -> { stats: { slug: views } } (cards). */
export async function GET(req: NextRequest) {
  const HEADERS = apiHeaders(req.headers.get('origin'), 'no-store');
  const one = req.nextUrl.searchParams.get('slug');
  const many = req.nextUrl.searchParams.get('slugs');
  if (many !== null) {
    const slugs = [...new Set(many.split(',').filter(Boolean))].slice(0, MAX_BATCH);
    const stats: Record<string, number> = {};
    for (const slug of slugs) if (isKnownSlug(slug)) stats[slug] = getStats(slug).views;
    return NextResponse.json({ stats, since: viewsSince(), carried: viewsCarried() }, { headers: HEADERS });
  }
  if (!one || !isKnownSlug(one)) return NextResponse.json({ error: 'unknown slug' }, { status: 404, headers: HEADERS });
  return NextResponse.json({ ...getStats(one), since: viewsSince(), carried: viewsCarried() }, { headers: HEADERS });
}

/** POST { slug } records a view (once per IP per UTC day) and returns the stats. */
export async function POST(req: NextRequest) {
  const HEADERS = apiHeaders(req.headers.get('origin'), 'no-store');
  let slug: unknown;
  try {
    slug = ((await req.json()) as { slug?: unknown }).slug;
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400, headers: HEADERS });
  }
  if (typeof slug !== 'string' || !isKnownSlug(slug)) {
    return NextResponse.json({ error: 'unknown slug' }, { status: 404, headers: HEADERS });
  }
  recordView(slug, getClientIp(req.headers), req.headers.get('user-agent') ?? '');
  return NextResponse.json({ ...getStats(slug), since: viewsSince(), carried: viewsCarried() }, { headers: HEADERS });
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req.headers.get('origin')) });
}
