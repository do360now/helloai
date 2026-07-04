import { NextRequest, NextResponse } from 'next/server';
import { apiHeaders } from '@/lib/api';
import { serveProRecommend } from '@/lib/pay/pro_service';

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const HEADERS: Record<string, string> = apiHeaders(origin);

  try {
    const result = await serveProRecommend({
      preimage: req.headers.get('x-preimage'),
      callerId: req.headers.get('x-agent-id') ?? 'anonymous',
      params: req.nextUrl.searchParams,
    });

    const headers = result.receiptHeader
      ? { ...HEADERS, 'X-Receipt': result.receiptHeader }
      : HEADERS;
    return NextResponse.json(result.body, { status: result.status, headers });
  } catch (err) {
    console.error('[pro] unhandled error:', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: HEADERS }
    );
  }
}
