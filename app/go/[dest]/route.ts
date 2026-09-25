import { NextRequest, NextResponse } from 'next/server';
import { classifyUserAgent } from '@/lib/ua-class';

// Fixed allow-list. Never redirect to a URL taken from the request (open redirect).
const DESTINATIONS: Record<string, string> = {
  app: 'https://app.helloai.com',
  channels: 'https://app.helloai.com/channels/summarize',
};

const FROM_RE = /^[a-z0-9-]{1,32}$/;

export async function GET(req: NextRequest, { params }: { params: Promise<{ dest: string }> }) {
  const { dest } = await params;
  if (!Object.hasOwn(DESTINATIONS, dest)) {
    return new NextResponse('Not found', { status: 404 });
  }
  const rawFrom = req.nextUrl.searchParams.get('from');
  const from = rawFrom && FROM_RE.test(rawFrom) ? rawFrom : null;
  try {
    console.log(`[go-metrics] ${JSON.stringify({ ts: Date.now(), dest, from, ua: classifyUserAgent(req.headers.get('user-agent') ?? '') })}`);
  } catch {
    /* never break the redirect */
  }
  const res = NextResponse.redirect(DESTINATIONS[dest], 302);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
