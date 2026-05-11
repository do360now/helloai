import { NextRequest, NextResponse } from 'next/server';
import { getModels, getSiteConfig } from '@/data';
import { getCorsHeaders } from '@/lib/cors';

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const HEADERS = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    ...getCorsHeaders(origin),
  };
  const { searchParams } = req.nextUrl;
  const providerFilter = searchParams.get('provider')?.toLowerCase();

  let models = getModels();

  if (providerFilter) {
    models = models.filter((m) => m.provider.toLowerCase().includes(providerFilter));
  }

  const config = getSiteConfig();

  return NextResponse.json(
    {
      models,
      count: models.length,
      last_updated: config.lastUpdated,
    },
    { headers: HEADERS }
  );
}
