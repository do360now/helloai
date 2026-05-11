import { NextRequest, NextResponse } from 'next/server';
import { getModels, getCategories, getSiteConfig } from '@/data';
import { getCorsHeaders } from '@/lib/cors';

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const HEADERS = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    ...getCorsHeaders(origin),
  };
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
