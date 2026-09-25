import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAIUserAgent, detectAnomalousPattern, logRequest } from '@/lib/request-logger';
import { recordApiRequest, ipHash } from '@/lib/api-metrics';

const RATE_LIMIT = 100; // requests per minute
const WINDOW_MS = 60 * 1000;

// In-memory rate limit store
// For production: use Redis (Upstash) or Vercel Edge Config
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries periodically
// unref(): the timer must never keep the process (or a test run) alive on its own.
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000).unref?.(); // cleanup every minute

export function proxy(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  const agentId = request.headers.get('x-agent-id');
  const ipH = ipHash(ip); // alert lines carry the salted daily hash, never the raw IP
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const now = Date.now();

  // === AI Reconnaissance Detection ===
  if (isAIUserAgent(userAgent, agentId)) {
    console.warn(
      JSON.stringify({
        alert: 'AI_USER_AGENT_DETECTED',
        ip_hash: ipH,
        userAgent,
        endpoint: request.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      })
    );
  }

  // Log this request so detectAnomalousPattern has data to work with
  logRequest({
    timestamp: new Date().toISOString(),
    ip,
    userAgent,
    endpoint: request.nextUrl.pathname,
    params,
    responseStatus: 0,
  });

  const anomaly = detectAnomalousPattern(ip);
  if (anomaly.isAnomalous) {
    console.warn(
      JSON.stringify({
        alert: 'ANOMALOUS_ACCESS_PATTERN',
        ip_hash: ipH,
        reason: anomaly.reason,
        endpoint: request.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      })
    );
  }

  const metricsInfo = {
    method: request.method,
    path: request.nextUrl.pathname,
    userAgent,
    ip,
    params,
    agentId,
  };

  // === Rate Limiting ===
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    const resetTime = now + WINDOW_MS;
    rateLimitMap.set(ip, { count: 1, resetTime });
    recordApiRequest({ ...metricsInfo, rateLimited: false });
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT.toString());
    response.headers.set('X-RateLimit-Remaining', (RATE_LIMIT - 1).toString());
    response.headers.set('X-RateLimit-Reset', resetTime.toString());
    return response;
  }

  if (record.count >= RATE_LIMIT) {
    console.warn(
      JSON.stringify({
        alert: 'RATE_LIMIT_EXCEEDED',
        ip_hash: ipH,
        count: record.count,
        windowMs: WINDOW_MS,
        timestamp: new Date().toISOString(),
      })
    );

    recordApiRequest({ ...metricsInfo, rateLimited: true });
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
  recordApiRequest({ ...metricsInfo, rateLimited: false });

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