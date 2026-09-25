/**
 * The three alert lines in proxy.ts must carry ip_hash, never the raw IP
 * (terms text: pseudonymised, rotated daily). The UA stays: it makes the alert actionable.
 */
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

const IP = '198.51.100.201';
const mk = (ua: string, ip = IP) =>
  new NextRequest('http://localhost/api/models', { headers: { 'x-forwarded-for': ip, 'user-agent': ua } });

function alerts(spy: jest.SpyInstance) {
  return spy.mock.calls
    .map((c) => String(c[0]))
    .filter((l) => l.startsWith('{'))
    .map((l) => JSON.parse(l))
    .filter((j) => j.alert);
}

describe('proxy alert lines', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('AI_USER_AGENT_DETECTED has ip_hash and the UA, not the raw IP', () => {
    proxy(mk('langchain/0.2', '198.51.100.202'));
    const a = alerts(warn).find((j) => j.alert === 'AI_USER_AGENT_DETECTED');
    expect(a).toBeDefined();
    expect(a.ip_hash === null || /^[0-9a-f]{8}$/.test(a.ip_hash)).toBe(true);
    expect(a.userAgent).toBe('langchain/0.2');
    expect(a.ip).toBeUndefined();
    expect(JSON.stringify(warn.mock.calls)).not.toContain('198.51.100.202');
  });

  it('ANOMALOUS_ACCESS_PATTERN has ip_hash, not the raw IP', () => {
    for (let i = 0; i < 25; i++) proxy(mk('curl/8.5', '198.51.100.203'));
    const a = alerts(warn).find((j) => j.alert === 'ANOMALOUS_ACCESS_PATTERN');
    expect(a).toBeDefined();
    expect(a.ip).toBeUndefined();
    expect('ip_hash' in a).toBe(true);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('198.51.100.203');
  });

  it('RATE_LIMIT_EXCEEDED has ip_hash, not the raw IP', () => {
    for (let i = 0; i < 102; i++) proxy(mk('curl/8.5', '198.51.100.204'));
    const a = alerts(warn).find((j) => j.alert === 'RATE_LIMIT_EXCEEDED');
    expect(a).toBeDefined();
    expect(a.ip).toBeUndefined();
    expect('ip_hash' in a).toBe(true);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('198.51.100.204');
  });
});
