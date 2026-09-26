import { isIP } from 'node:net';

/**
 * Client IP from X-Forwarded-For, per docs/review/client-ip-and-rate-limit.md step 1.
 * Takes the entry the outermost trusted proxy saw (index length - hops), not the first
 * one, which the client controls. Strips a trailing :port, validates, else 'unknown'.
 * The default of 1 hop is UNVERIFIED for Azure (that plan's step 0): set TRUSTED_PROXY_HOPS
 * once a real request has been inspected.
 */
export function getClientIp(headers: Headers, hops = Number(process.env.TRUSTED_PROXY_HOPS ?? '1')): string {
  const parts = (headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return 'unknown';
  const h = Number.isInteger(hops) && hops >= 1 ? hops : 1;
  let ip = parts[Math.max(0, parts.length - h)];
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(ip);
  if (bracketed) ip = bracketed[1];
  else if (/^[^:]+:\d+$/.test(ip)) ip = ip.slice(0, ip.lastIndexOf(':'));
  return isIP(ip) ? ip : 'unknown';
}
