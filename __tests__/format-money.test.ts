import { formatUsdPerMillion, formatContextWindow } from '@/data';

describe('formatUsdPerMillion', () => {
  it('formats integer dollars without decimals', () => {
    expect(formatUsdPerMillion(10)).toBe('$10/M');
    expect(formatUsdPerMillion(2)).toBe('$2/M');
  });

  it('keeps two-decimal prices', () => {
    expect(formatUsdPerMillion(1.25)).toBe('$1.25/M');
    expect(formatUsdPerMillion(4.25)).toBe('$4.25/M');
  });

  it('returns an em dash for non-finite input', () => {
    expect(formatUsdPerMillion(Number.NaN)).toBe('—');
    expect(formatUsdPerMillion(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatContextWindow', () => {
  it('formats millions', () => {
    expect(formatContextWindow(1_000_000)).toBe('1M ctx');
    expect(formatContextWindow(2_000_000)).toBe('2M ctx');
  });

  it('formats thousands', () => {
    expect(formatContextWindow(500_000)).toBe('500K ctx');
    expect(formatContextWindow(128_000)).toBe('128K ctx');
  });

  it('formats small windows in tokens', () => {
    expect(formatContextWindow(800)).toBe('800 ctx');
  });

  it('returns an em dash for non-positive or non-finite input', () => {
    expect(formatContextWindow(0)).toBe('—');
    expect(formatContextWindow(-1)).toBe('—');
    expect(formatContextWindow(Number.NaN)).toBe('—');
  });
});
