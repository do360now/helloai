import { eloBarWidth } from '@/data/leaderboard';
import { getModels } from '@/data';

describe('eloBarWidth', () => {
  it('stays within [10, 100] for every current model', () => {
    const elos = getModels().map((m) => m.elo);
    const min = Math.min(...elos);
    const max = Math.max(...elos);
    for (const elo of elos) {
      const w = eloBarWidth(elo, min, max);
      expect(w).toBeGreaterThanOrEqual(10);
      expect(w).toBeLessThanOrEqual(100);
    }
  });

  it('maps min to 10 and max to 100', () => {
    expect(eloBarWidth(1475, 1475, 1508)).toBe(10);
    expect(eloBarWidth(1508, 1475, 1508)).toBe(100);
  });

  it('returns 100 when all elos are equal', () => {
    expect(eloBarWidth(1500, 1500, 1500)).toBe(100);
  });

  it('clamps out-of-range input', () => {
    expect(eloBarWidth(1400, 1475, 1508)).toBe(10);
    expect(eloBarWidth(1600, 1475, 1508)).toBe(100);
  });
});
