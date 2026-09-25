import { createHash } from 'node:crypto';
import { classifyUserAgent, type UaClass } from './ua-class';

const PREFIX = '[api-metrics]';
const MAX_PATH_KEYS = 50; // /api/:path* matches arbitrary paths; bound the counter map

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

function stdoutEnabled(): boolean {
  return (process.env.API_METRICS_STDOUT ?? 'true') !== 'false';
}

/** First 8 hex chars of sha256(dailySalt + ip). Salt rotates every UTC day. */
function ipHash(ip: string): string {
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
    const key = info.path in st.byPath || Object.keys(st.byPath).length < MAX_PATH_KEYS ? info.path : 'other';
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
