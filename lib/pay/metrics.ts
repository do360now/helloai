import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { getConfig } from './config';
import type { ProRequestEvent } from './types';

const STDOUT_PREFIX = '[pro-metrics]';

function stdoutEnabled(): boolean {
  return (process.env.PRO_METRICS_STDOUT ?? 'true') !== 'false';
}
function fileEnabled(): boolean {
  return (process.env.PRO_METRICS_FILE ?? 'true') !== 'false';
}
function metricsPath(): string {
  return join(getConfig().ledgerDir, 'pro-requests.jsonl');
}

/**
 * Record one /api/pro/recommend request for demand instrumentation.
 * Best-effort and non-throwing — observability must never break the request path.
 * NEVER pass a preimage into this function; only the derived paymentHash.
 */
export function recordProRequest(event: Omit<ProRequestEvent, 'ts'>): void {
  const full: ProRequestEvent = { ts: Date.now(), ...event };
  const line = JSON.stringify(full);

  try {
    if (stdoutEnabled()) console.log(`${STDOUT_PREFIX} ${line}`);
  } catch {
    /* never throw from observability */
  }

  try {
    if (fileEnabled()) {
      const dir = getConfig().ledgerDir;
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(metricsPath(), line + '\n');
    }
  } catch {
    /* best effort: read-only / ephemeral container FS, etc. */
  }
}
