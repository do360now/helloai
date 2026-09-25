import { NextRequest, NextResponse } from 'next/server';
import { apiHeaders } from '@/lib/api';

// Frozen 2026-09-25 (docs/review/monetisation.md, step 2): money flows only through
// app.helloai.com. lib/pay/* is kept unchanged so the work is not lost; nothing calls it.
export function GET(req: NextRequest) {
  const HEADERS = apiHeaders(req.headers.get('origin'));
  return NextResponse.json({ error: 'gone', see: 'https://app.helloai.com' }, { status: 410, headers: HEADERS });
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: apiHeaders(req.headers.get('origin')) });
}
