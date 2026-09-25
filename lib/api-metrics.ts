import { createHash } from 'node:crypto';
import { classifyUserAgent, type UaClass } from './ua-class';

const PREFIX = '[api-metrics]';
// /api/:path* matches arbitrary paths and usage.by_path is public JSON, so count only
// the endpoints we serve and bucket everything else as "other".
const KNOWN_PATHS = new Set([
  '/api/models',
  '/api/recommend',
  '/api/status',
  '/api/openapi.json',
  '/api/pro/recommend',
]);

export interface ApiRequestInfo {
  path: string;
  userAgent: string;
  ip: string;
  params: Record<string, string>;
  rateLimited: boolean;
  agentId?: string | null;
}

export interface UsageSnapshot {
  since: string;
  total: number;
  by_ua: Partial<Record<UaClass, number>>;
  by_path: Record<string, number>;
}

// The proxy and the route handlers are bundled separately, so plain module
// variables would be two different copies. Keep the counters on globalThis
// (one Node process per container) so /api/status can read what the proxy wrote.
interface UsageState {
  since: string;
  total: number;
  byUa: Partial<Record<UaClass, number>>;
  byPath: Record<string, number>;
}
const STATE_KEY = '__helloai_api_usage__';
const g = globalThis as unknown as Record<string, UsageState | undefined>;
function freshState(): UsageState {
  return { since: new Date().toISOString(), total: 0, byUa: {}, byPath: {} };
}
function state(): UsageState {
  return (g[STATE_KEY] ??= freshState());
}
state(); // start the clock at module load, not at the first request

function stdoutEnabled(): boolean {
  return (process.env.API_METRICS_STDOUT ?? 'true') !== 'false';
}

let warnedNoSalt = false;

/**
 * First 8 hex chars of sha256(dailySalt + ip). Salt rotates every UTC day.
 * Fails closed: in production with METRICS_SALT unset the hash would be reversible
 * over all of IPv4, so return null (and warn once) instead of logging it.
 * Pseudonymised, not anonymous: whoever holds the salt and the logs can brute-force IPv4.
 */
function ipHash(ip: string): string | null {
  if (process.env.NODE_ENV === 'production' && !process.env.METRICS_SALT) {
    if (!warnedNoSalt) {
      warnedNoSalt = true;
      console.warn('[api-metrics] METRICS_SALT is not set in production; ip_hash is logged as null');
    }
    return null;
  }
  const salt = `${process.env.METRICS_SALT ?? 'dev'}${new Date().toISOString().slice(0, 10)}`;
  return createHash('sha256').update(salt + ip).digest('hex').slice(0, 8);
}

/**
 * Count one /api request and (unless API_METRICS_STDOUT=false) emit one
 * `[api-metrics] {json}` line. Logs param KEYS only and a daily-rotating IP
 * hash, never the raw IP. Best-effort: never throws.
 */
export function recordApiRequest(info: ApiRequestInfo): void {
  try {
    const ua = classifyUserAgent(info.userAgent, { agentId: info.agentId });
    const st = state();
    st.total++;
    st.byUa[ua] = (st.byUa[ua] ?? 0) + 1;
    const key = KNOWN_PATHS.has(info.path) ? info.path : 'other';
    st.byPath[key] = (st.byPath[key] ?? 0) + 1;

    if (stdoutEnabled()) {
      console.log(
        `${PREFIX} ${JSON.stringify({
          ts: Date.now(),
          path: info.path,
          ua,
          ip_hash: ipHash(info.ip),
          param_keys: Object.keys(info.params),
          rate_limited: info.rateLimited,
        })}`
      );
    }
  } catch {
    /* observability must never break a request */
  }
}

/** Per-container counters since process start. Resets on restart; not a total. */
export function usageSnapshot(): UsageSnapshot {
  const st = state();
  return { since: st.since, total: st.total, by_ua: { ...st.byUa }, by_path: { ...st.byPath } };
}

export function resetUsageForTests(): void {
  g[STATE_KEY] = freshState();
}
