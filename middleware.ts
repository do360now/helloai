import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAIUserAgent, detectAnomalousPattern } from '@/lib/request-logger';

const RATE_LIMIT = 100; // requests per minute
const WINDOW_MS = 60 * 1000;

// In-memory rate limit store
// For production: use Redis (Upstash) or Vercel Edge Config
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000); // cleanup every minute

export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Get IP - in Vercel/production, use request.ip; locally use forwarded header
  const ip = (request as unknown as { ip?: string }).ip || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  const now = Date.now();

  // === AI Reconnaissance Detection ===
  if (isAIUserAgent(userAgent)) {
    console.warn(
      JSON.stringify({
        alert: 'AI_USER_AGENT_DETECTED',
        ip,
        userAgent,
        endpoint: request.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      })
    );
  }

  const anomaly = detectAnomalousPattern(ip);
  if (anomaly.isAnomalous) {
    console.warn(
      JSON.stringify({
        alert: 'ANOMALOUS_ACCESS_PATTERN',
        ip,
        reason: anomaly.reason,
        endpoint: request.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      })
    );
  }

  // === Rate Limiting ===
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return NextResponse.next();
  }

  if (record.count >= RATE_LIMIT) {
    console.warn(
      JSON.stringify({
        alert: 'RATE_LIMIT_EXCEEDED',
        ip,
        count: record.count,
        windowMs: WINDOW_MS,
        timestamp: new Date().toISOString(),
      })
    );

    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString(),
        'X-RateLimit-Limit': RATE_LIMIT.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': record.resetTime.toString(),
      },
    });
  }

  record.count++;

  // Add rate limit headers to successful responses
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', RATE_LIMIT.toString());
  response.headers.set('X-RateLimit-Remaining', (RATE_LIMIT - record.count).toString());
  response.headers.set('X-RateLimit-Reset', record.resetTime.toString());

  return response;
}

export const config = {
  matcher: '/api/:path*',
};