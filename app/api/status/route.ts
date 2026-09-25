import { NextRequest, NextResponse } from 'next/server';
import { getModels, getCategories, getSiteConfig } from '@/data';
import { apiHeaders } from '@/lib/api';
import { usageSnapshot } from '@/lib/api-metrics';

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const HEADERS = apiHeaders(origin, 'public, s-maxage=60, stale-while-revalidate=120');
  const config = getSiteConfig();
  const models = getModels();
  const categories = getCategories();

  return NextResponse.json(
    {
      status: 'ok',
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',
      data_last_updated: config.lastUpdated,
      models_count: models.length,
      categories_count: categories.length,
      rate_limit: {
        limit: 100,
        window: '1 minute',
        by: 'IP address',
        scope: 'per IP',
      },
      terms_of_use: {
        description: 'This is a public API intended for fair use. Automated scraping or abuse may result in IP blocking.',
        allowed: ['Model recommendations', 'AI agent queries', 'Personal/professional projects'],
        prohibited: ['Commercial data resale', 'Competitive scraping', 'DoS/abuse'],
        privacy:
          'What we log: for each API request we record the time, the path, the names (not the values) of the query parameters, the kind of client (worked out from its User-Agent), ' +
          'and a pseudonymous identifier: a shortened hash of your IP address combined with a secret salt that changes every day, so it cannot be linked from one day to the next. ' +
          'Alerts about unusual traffic also record the User-Agent string. Raw IP addresses are held in memory only, for rate limiting and abuse detection, and are never written to our logs. ' +
          'We set no cookies and use no third-party analytics. Links from this site to app.helloai.com pass through helloai.com/go/, which counts the click and records no visitor identifier. ' +
          'The site runs on Microsoft Azure, which may keep its own logs, including IP addresses, under its own terms; these terms describe what the application itself logs.',
      },
      usage: {
        ...usageSnapshot(),
        note: 'Counts since this container process started. Resets on restart and covers only this container process (per-worker if workers are added); not a total.',
      },
      endpoints: [
        { path: '/api/models', method: 'GET', params: ['provider'] },
        { path: '/api/recommend', method: 'GET', params: ['task', 'max_cost', 'min_context', 'provider', 'limit'] },
        { path: '/api/status', method: 'GET', params: [] },
      ],
    },
    { headers: HEADERS }
  );
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: apiHeaders(req.headers.get('origin')) });
}
