import { NextRequest, NextResponse } from 'next/server';
import { getModels, getSiteConfig } from '@/data';
import { isRated } from '@/data/recommend';
import { apiHeaders, publicUnlessParameterized } from '@/lib/api';

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const { searchParams } = req.nextUrl;
  const providerFilter = searchParams.get('provider')?.toLowerCase();
  // Parameterized requests are user-controlled (and could be used for
  // cache-key probing), so don't share-cache them. The unfiltered list stays
  // public+cacheable — parity with /api/recommend.
  const HEADERS = apiHeaders(origin, publicUnlessParameterized(searchParams));

  let models = getModels();

  if (providerFilter) {
    models = models.filter((m) => m.provider.toLowerCase().includes(providerFilter));
  }

  const config = getSiteConfig();

  return NextResponse.json(
    {
      // `rated` is false when the stored elo is a predecessor's, missing or stale: an agent that reads
      // only `elo` must not mistake it for the model's own score (see elo_source).
      models: models.map((m) => ({ ...m, rated: isRated(m) })),
      count: models.length,
      last_updated: config.lastUpdated,
    },
    { headers: HEADERS }
  );
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: apiHeaders(req.headers.get('origin')) });
}
