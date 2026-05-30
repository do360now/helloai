import { sha256OfHex, sha256OfString, hmacHex, stableStringify } from '@/lib/pay/hash';

describe('hash utils', () => {
  test('sha256OfHex matches known empty-input vector', () => {
    expect(sha256OfHex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });

  test('preimage hashes to a stable 64-hex payment hash', () => {
    const preimage = '00'.repeat(32);
    const hash = sha256OfHex(preimage);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256OfHex(preimage)).toBe(hash); // deterministic
  });

  test('sha256OfString and hmacHex are deterministic and hex', () => {
    expect(sha256OfString('hello')).toBe(sha256OfString('hello'));
    expect(hmacHex('k', 'msg')).toMatch(/^[0-9a-f]{64}$/);
    expect(hmacHex('k', 'msg')).not.toBe(hmacHex('other', 'msg'));
  });

  test('stableStringify is key-order independent', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
    expect(stableStringify({ a: 2, b: 1 })).toBe('{"a":2,"b":1}');
    expect(stableStringify([3, { y: 1, x: 2 }])).toBe('[3,{"x":2,"y":1}]');
  });
});
