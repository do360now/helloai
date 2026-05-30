import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders } from '@/lib/cors';
import { serveProRecommend } from '@/lib/pay/pro_service';

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const HEADERS: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getCorsHeaders(origin),
  };

  const result = await serveProRecommend({
    preimage: req.headers.get('x-preimage'),
    callerId: req.headers.get('x-agent-id') ?? 'anonymous',
    params: req.nextUrl.searchParams,
  });

  const headers = result.receiptHeader
    ? { ...HEADERS, 'X-Receipt': result.receiptHeader }
    : HEADERS;
  return NextResponse.json(result.body, { status: result.status, headers });
}
