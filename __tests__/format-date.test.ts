import { formatDate } from '@/data';

describe('formatDate', () => {
  it('formats a YYYY-MM-DD string', () => {
    expect(formatDate('2026-07-04')).toBe('Jul 4, 2026');
  });

  it('is timezone-independent (regression: parsed as local time)', () => {
    // Same calendar date regardless of runtime TZ; run with TZ=Pacific/Kiritimati (UTC+14) to reproduce the old bug.
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026');
  });
});
