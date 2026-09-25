import { snapshotHash, SCORING_VERSION, normalizationBasis } from '../lib/scoring-snapshot';
import { getModels, getCategories } from '../data';
import { withBorrowed } from './helpers/roster';

describe('scoring snapshot hash (a fingerprint of the SCORING inputs only)', () => {
  const models = getModels();
  const categories = getCategories();
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

  test('has the form sha256:<12 hex> and is stable', () => {
    const h = snapshotHash(models, categories);
    expect(h).toMatch(/^sha256:[0-9a-f]{12}$/);
    expect(snapshotHash(models, categories)).toBe(h);
  });

  test('reordering object keys does not change it (canonical JSON)', () => {
    const reordered = models.map((m) => Object.fromEntries(Object.entries(m).reverse()));
    expect(snapshotHash(reordered as typeof models, categories)).toBe(snapshotHash(models, categories));
  });

  test.each([
    ['an Elo value', (ms: typeof models) => { ms[0].elo += 1; }],
    ['an input price', (ms: typeof models) => { ms[0].cost_per_million_tokens += 1; }],
    ['a context window', (ms: typeof models) => { ms[0].context_window += 1; }],
    ['a strength', (ms: typeof models) => { ms[0].strengths = [...ms[0].strengths, 'Something Else']; }],
    ['whether a model is rated', (ms: typeof models) => { ms[0].elo_source = { ...ms[0].elo_source!, matches_listed_model: !ms[0].elo_source!.matches_listed_model }; }],
  ])('changing %s changes the snapshot', (_what, mutate) => {
    const changed = clone(models);
    mutate(changed);
    expect(snapshotHash(changed, categories)).not.toBe(snapshotHash(models, categories));
  });

  test('changing a category leader or name changes it', () => {
    const cats = clone(categories);
    cats[0].leader = 'Someone Else';
    expect(snapshotHash(models, cats)).not.toBe(snapshotHash(models, categories));
    const renamed = clone(categories);
    renamed[0].name += ' X';
    expect(snapshotHash(models, renamed)).not.toBe(snapshotHash(models, categories));
  });

  // The weekly data update bumps lastUpdated and rewrites prose without touching a single score. An agent that
  // follows "comparable only if the snapshot agrees" must not discard valid comparisons because of that.
  test('prose and dates that do not affect a score do NOT change it (a3)', () => {
    const edited = clone(models);
    edited[0].desc += ' One more sentence.';
    edited[0].tag = 'New tag';
    edited[0].color = '#000000';
    edited[0].elo_source = { ...edited[0].elo_source!, checked_date: '2099-01-01', snapshot_date: edited[0].elo_source!.snapshot_date };
    expect(snapshotHash(edited, categories)).toBe(snapshotHash(models, categories));
    const cats = clone(categories);
    cats[0].insight += ' More words.';
    expect(snapshotHash(models, cats)).toBe(snapshotHash(models, categories));
  });

  test('a borrowed model\'s own Elo number is not a scoring input (it cannot move anyone)', () => {
    const a = withBorrowed(models, ['claude']);
    const b = clone(a);
    b.find((m) => m.id === 'claude')!.elo = 2500;
    expect(snapshotHash(b, categories)).toBe(snapshotHash(a, categories));
  });

  test('the order of models.json and categories.json does not change it (d8, a3)', () => {
    expect(snapshotHash([...models].reverse(), categories)).toBe(snapshotHash(models, categories));
    expect(snapshotHash(models, [...categories].reverse())).toBe(snapshotHash(models, categories));
  });

  test('a rename that breaks a leader or strength match changes it, even though id, price and strengths did not', () => {
    // Scoring matches on the model NAME (leader === name), so renaming the leader silently drops its +0.40.
    const leaderName = categories[0].leader;
    const renamed = clone(models).map((m) => (m.name === leaderName ? { ...m, name: `${m.name} Fast` } : m));
    expect(snapshotHash(renamed, categories)).not.toBe(snapshotHash(models, categories));
  });

  test('renaming the category leader to another model changes it', () => {
    const other = models.find((m) => m.name !== categories[0].leader)!;
    const cats = clone(categories);
    cats[0].leader = other.name;
    expect(snapshotHash(models, cats)).not.toBe(snapshotHash(models, categories));
  });

  test('exposes the scoring version and normalization basis', () => {
    expect(SCORING_VERSION).toBe(1);
    expect(normalizationBasis).toBe('all_tracked_models');
  });
});
