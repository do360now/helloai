import { NextRequest, NextResponse } from 'next/server';
import { getModels, getSiteConfig } from '@/data';
import { apiHeaders } from '@/lib/api';

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const { searchParams } = req.nextUrl;
  const providerFilter = searchParams.get('provider')?.toLowerCase();
  // Parameterized requests are user-controlled (and could be used for
  // cache-key probing), so don't share-cache them. The unfiltered list stays
  // public+cacheable — parity with /api/recommend.
  const HEADERS = apiHeaders(
    origin,
    providerFilter
      ? 'private, no-store'
      : 'public, s-maxage=300, stale-while-revalidate=600'
  );

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
