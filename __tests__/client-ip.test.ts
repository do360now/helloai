import { getClientIp } from '@/lib/client-ip';

const h = (xff?: string) => new Headers(xff === undefined ? {} : { 'x-forwarded-for': xff });

describe('getClientIp', () => {
  test('single entry', () => expect(getClientIp(h('203.0.113.9'), 1)).toBe('203.0.113.9'));
  test('takes the entry the trusted proxy saw, not the client-supplied first one', () => {
    expect(getClientIp(h('6.6.6.6, 203.0.113.9'), 1)).toBe('203.0.113.9');
    expect(getClientIp(h('6.6.6.6, 203.0.113.9, 10.0.0.1'), 2)).toBe('203.0.113.9');
  });
  test('more hops than entries uses the first', () => expect(getClientIp(h('203.0.113.9'), 3)).toBe('203.0.113.9'));
  test('strips ports', () => {
    expect(getClientIp(h('203.0.113.9:5678'), 1)).toBe('203.0.113.9');
    expect(getClientIp(h('[2001:db8::1]:443'), 1)).toBe('2001:db8::1');
    expect(getClientIp(h('2001:db8::1'), 1)).toBe('2001:db8::1');
  });
  test.each(['', 'abc', '<script>', '999.1.1.1'])('garbage %j -> unknown', (v) => {
    expect(getClientIp(h(v), 1)).toBe('unknown');
  });
  test('missing header -> unknown', () => expect(getClientIp(h(), 1)).toBe('unknown'));
});
