import { createHash, createHmac } from 'crypto';

/** sha256 of the bytes decoded from a hex string, returned as hex. */
export function sha256OfHex(hex: string): string {
  return createHash('sha256').update(Buffer.from(hex, 'hex')).digest('hex');
}

/** sha256 of a utf8 string, returned as hex. */
export function sha256OfString(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/** HMAC-SHA256 of a utf8 message under a utf8 key, returned as hex. */
export function hmacHex(key: string, msg: string): string {
  return createHmac('sha256', key).update(msg, 'utf8').digest('hex');
}

/** Deterministic JSON: object keys sorted recursively. */
export function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const rec = obj as Record<string, unknown>;
  const keys = Object.keys(rec).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(rec[k])).join(',') + '}';
}
