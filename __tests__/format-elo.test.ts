import { formatElo, boardDateLabel } from '../data';
import type { Model } from '../data/types';
import { getModels } from '../data';
import { borrowedIds } from './helpers/roster';

const base = getModels().find((m) => m.id === 'fable')!;
const mk = (over: Partial<Model>, src: Partial<NonNullable<Model['elo_source']>> = {}): Model => ({
  ...base,
  ...over,
  elo_source: { ...base.elo_source!, ...src },
});

describe('formatElo config and slug', () => {
  test('an own score carries the measured config and the exact slug, for cards and rows to render', () => {
    const f = formatElo(base);
    expect(f.config).toBe('max');
    expect(f.arenaModel).toBe('claude-fable-5.1-max');
  });

  test('a score without an effort suffix has no config', () => {
    const m = mk({}, { config: undefined, arena_model: 'gemini-3.1-pro-preview' });
    expect(formatElo(m).config).toBeNull();
    expect(formatElo(m).arenaModel).toBe('gemini-3.1-pro-preview');
  });
});

describe('boardDateLabel (mixed snapshots must not look newer than they are)', () => {
  const all = getModels();
  const withDates = (dates: string[]) => all.map((m, i) => ({ ...m, elo_source: { ...m.elo_source!, snapshot_date: dates[i % dates.length] } }));

  test('one shared date is shown once', () => {
    const l = boardDateLabel(withDates(['2026-09-13']));
    expect(l.mixed).toBe(false);
    expect(l.text).toMatch(/Sep 13, 2026/);
  });

  test('when only one row is newer, the label is a range and says so, never just the newest date', () => {
    const models = withDates(['2026-09-13']);
    models[0] = { ...models[0], elo_source: { ...models[0].elo_source!, snapshot_date: '2026-09-25' } };
    const l = boardDateLabel(models);
    expect(l.mixed).toBe(true);
    expect(l.text).toMatch(/Sep 13, 2026/);
    expect(l.text).toMatch(/Sep 25, 2026/);
    expect(l.text).toMatch(/mixed|each row/i);
  });
});

describe('formatElo', () => {
  test('an interval shows as "score ± half-width", never with a tilde or rounding', () => {
    const f = formatElo(base);
    expect(f.score).toBe('1498 ± 8');
    expect(f.score).not.toMatch(/~/);
    expect(f.note).toBeNull();
    expect(f.state).toBe('rated');
  });

  test('an asymmetric interval prints as a range, never a misleading ±', () => {
    const f = formatElo(mk({ elo: 1500 }, { ci_low: 1490, ci_high: 1512 }));
    expect(f.score).toBe('1500 [1490–1512]');
    expect(f.score).not.toMatch(/±/);
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

  test('every shipped model formats without throwing, and exactly the borrowed ones are labelled', () => {
    const states = getModels().map((m) => [m.id, formatElo(m).state]);
    expect(states.filter(([, s]) => s === 'borrowed').map(([id]) => id).sort()).toEqual(borrowedIds(getModels()));
  });
});
