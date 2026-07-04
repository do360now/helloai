import { getCorsHeaders } from '@/lib/cors';

// Standard JSON response headers: Content-Type + CORS, plus an optional
// Cache-Control. Pass no `cacheControl` (or null) to omit the header entirely
// (used by the paid /api/pro/recommend endpoint, which must never be cached).
//
// Replaces the per-route HEADERS boilerplate that duplicated Content-Type and
// getCorsHeaders() across every route handler.
export function apiHeaders(
  origin: string | null,
  cacheControl?: string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getCorsHeaders(origin),
  };
  if (cacheControl) {
    headers['Cache-Control'] = cacheControl;
  }
  return headers;
}
