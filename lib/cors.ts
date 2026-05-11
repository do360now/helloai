/**
 * CORS Configuration
 *
 * Security: Restrict to known origins for production.
 * Development: Allow localhost.
 */

// Known origins for helloai
const ALLOWED_ORIGINS = [
  'https://helloai.com',
  'https://www.helloai.com',
  'http://localhost:3000', // dev only
  'http://localhost:3001', // alt dev port
];

// Environment-specific origins (for Vercel preview deployments)
const getAllowedOrigins = (): string[] => {
  const origins = [...ALLOWED_ORIGINS];

  // Add Vercel preview deployments if available
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  return origins;
};

/**
 * Get CORS headers for a given origin
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();

  // If no origin header, allow based on environment
  if (!origin) {
    // In production, require origin header
    if (process.env.NODE_ENV === 'production') {
      return {
        'Access-Control-Allow-Origin': 'https://helloai.com',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };
    }
    // In dev, allow all
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }

  // Check if origin is allowed
  if (allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    };
  }

  // Origin not allowed - in production, still allow but limit to default
  if (process.env.NODE_ENV === 'production') {
    return {
      'Access-Control-Allow-Origin': 'https://helloai.com',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }

  // Dev mode: allow all
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return process.env.NODE_ENV !== 'production';

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

/**
 * Default CORS headers (backward compatible with existing code)
 */
export const DEFAULT_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};