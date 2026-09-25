import { formatElo } from '../data';
import type { Model } from '../data/types';
import { getModels } from '../data';

const base = getModels().find((m) => m.id === 'fable')!;
const mk = (over: Partial<Model>, src: Partial<NonNullable<Model['elo_source']>> = {}): Model => ({
  ...base,
  ...over,
  elo_source: { ...base.elo_source!, ...src },
});

describe('formatElo', () => {
  test('an interval shows as "score ± half-width", never with a tilde or rounding', () => {
    const f = formatElo(base);
    expect(f.score).toBe('1498 ± 8');
    expect(f.score).not.toMatch(/~/);
    expect(f.note).toBeNull();
    expect(f.state).toBe('rated');
  });

  test('an own score without an interval shows the exact score and says the interval is unavailable', () => {
    const m = mk({ elo: 1490 }, { ci_low: undefined, ci_high: undefined });
    const f = formatElo(m);
    expect(f.score).toBe('1490');
    expect(f.note).toMatch(/interval not available/i);
    expect(f.state).toBe('rated');
  });

  test("a borrowed score is labelled as a predecessor's, names the slug, and is never shown with an interval", () => {
    const m = mk({ elo: 1493 }, { matches_listed_model: false, arena_model: 'claude-opus-5-high', ci_low: undefined, ci_high: undefined, votes: undefined });
    const f = formatElo(m);
    expect(f.state).toBe('borrowed');
    expect(f.score).toBe('1493');
    expect(f.score).not.toMatch(/±/);
    expect(f.note).toMatch(/not yet rated/i);
    expect(f.note).toMatch(/predecessor/i);
    expect(f.note).toContain('claude-opus-5-high');
  });

  test('missing and stale scores say so', () => {
    expect(formatElo(mk({}, { status: 'missing' })).state).toBe('missing');
    expect(formatElo(mk({}, { status: 'stale' })).state).toBe('stale');
  });

  test('every shipped model formats without throwing, and only the two borrowed ones are labelled', () => {
    const states = getModels().map((m) => [m.id, formatElo(m).state]);
    expect(states.filter(([, s]) => s === 'borrowed').map(([id]) => id).sort()).toEqual(['claude', 'grok']);
  });
});
