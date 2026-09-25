/**
 * Tests for the recommendation engine (data/recommend.ts).
 *
 * These lock the scoring weights, category matching, and normalization
 * edge cases so the ranking behavior is regression-proof. Per the project
 * decision, the weights are preserved (not tuned) — these tests encode the
 * existing contract.
 */

import { scoreAndRank, findMatchingCategory, categoryTaskKeyword, SCORING_WEIGHTS, isRated, RATING_POLICY } from '../data/recommend';
import { getModels, getCategories } from '../data';
import type { Model, Category } from '../data/types';
import { withBorrowed, borrowedIds } from './helpers/roster';

const models = getModels();
const categories = getCategories();

describe('SCORING_WEIGHTS', () => {
  test('with-task weights are 40/35/15/10', () => {
    expect(SCORING_WEIGHTS.withTask).toEqual({
      task: 0.40,
      elo: 0.35,
      cost: 0.15,
      context: 0.10,
    });
  });

  test('no-task weights are 0/55/25/20', () => {
    expect(SCORING_WEIGHTS.withoutTask).toEqual({
      task: 0.00,
      elo: 0.55,
      cost: 0.25,
      context: 0.20,
    });
  });

  test('each weight set sums to 1.0', () => {
    for (const w of [SCORING_WEIGHTS.withTask, SCORING_WEIGHTS.withoutTask]) {
      const sum = w.task + w.elo + w.cost + w.context;
      expect(Math.round(sum * 100) / 100).toBe(1);
    }
  });
});

describe('findMatchingCategory', () => {
  test('clause 1: category name contains task substring', () => {
    expect(findMatchingCategory('reasoning', categories)?.name).toBe('Hard Reasoning & Science');
    expect(findMatchingCategory('coding', categories)?.name).toBe('Coding & Engineering');
    expect(findMatchingCategory('daily', categories)?.name).toBe('Honest Daily Use');
  });

  test('clause 2: task contains first word of category name', () => {
    expect(findMatchingCategory('hard', categories)?.name).toBe('Hard Reasoning & Science');
    expect(findMatchingCategory('honest', categories)?.name).toBe('Honest Daily Use');
  });

  test('empty/whitespace task returns null', () => {
    expect(findMatchingCategory('', categories)).toBeNull();
    expect(findMatchingCategory('   ', categories)).toBeNull();
  });

  test('non-matching task returns null', () => {
    expect(findMatchingCategory('xyzzy-nothing-matches', categories)).toBeNull();
  });

  test('first-word fallback is guarded against single-token category names', () => {
    const singleTokenCats: Category[] = [
      { name: 'Whatevs', leader: 'X', insight: '', icon: '', color: '#000000' },
    ];
    // 'w' is contained in 'whatevs' via clause 1 already; ensure clause 2
    // doesn't blow up on a category with no space in its name.
    expect(findMatchingCategory('whatevs', singleTokenCats)?.name).toBe('Whatevs');
    expect(findMatchingCategory('nope', singleTokenCats)).toBeNull();
  });
});

describe('categoryTaskKeyword', () => {
  test('returns the first word, lowercased', () => {
    expect(categoryTaskKeyword({ name: 'Overall Preference', leader: 'x', insight: '', icon: '', color: '#000000' })).toBe('overall');
    expect(categoryTaskKeyword({ name: 'Coding & Engineering', leader: 'x', insight: '', icon: '', color: '#000000' })).toBe('coding');
    expect(categoryTaskKeyword({ name: 'Hard Reasoning & Science', leader: 'x', insight: '', icon: '', color: '#000000' })).toBe('hard');
    expect(categoryTaskKeyword({ name: 'Honest Daily Use', leader: 'x', insight: '', icon: '', color: '#000000' })).toBe('honest');
  });

  test('matches live category records', () => {
    for (const cat of categories) {
      expect(categoryTaskKeyword(cat)).toBe(cat.name.split(' ')[0].toLowerCase());
    }
  });
});

describe('scoreAndRank — edge cases', () => {
  test('empty models → empty recommendations, no NaN', () => {
    const r = scoreAndRank([], categories, { task: 'coding' });
    expect(r.recommendations).toEqual([]);
    expect(r.excluded).toBe(0);
    expect(r.matchedCategory).not.toBeNull();
  });

  test('single candidate → finite score, no NaN', () => {
    const one = models.slice(0, 1);
    const r = scoreAndRank(one, categories, {});
    expect(r.recommendations).toHaveLength(1);
    expect(Number.isFinite(r.recommendations[0].score)).toBe(true);
  });

  test('equal-Elo candidates all get the same score', () => {
    const equal: Model[] = models.slice(0, 3).map((m) => ({
      ...m,
      elo: 1500,
      cost_per_million_tokens: 5,
      context_window: 1000000,
    }));
    const r = scoreAndRank(equal, categories, {});
    const scores = r.recommendations.map((x) => x.score);
    expect(new Set(scores).size).toBe(1);
    expect(Number.isFinite(scores[0])).toBe(true);
  });

  test('every score is finite (no NaN leaks) across real data', () => {
    const r = scoreAndRank(models, categories, { task: 'coding', maxCost: 10, minContext: 100000 });
    for (const rec of r.recommendations) {
      expect(Number.isFinite(rec.score)).toBe(true);
    }
  });
});

describe('scoreAndRank — filtering', () => {
  test('maxCost excludes pricier models', () => {
    const r = scoreAndRank(models, categories, { maxCost: 2 });
    for (const rec of r.recommendations) {
      expect(rec.model.cost_per_million_tokens).toBeLessThanOrEqual(2);
    }
    expect(r.excluded).toBeGreaterThan(0);
  });

  test('minContext excludes smaller-context models', () => {
    const r = scoreAndRank(models, categories, { minContext: 1_000_000 });
    for (const rec of r.recommendations) {
      expect(rec.model.context_window).toBeGreaterThanOrEqual(1_000_000);
    }
  });

  test('provider filter narrows to matching providers only', () => {
    const r = scoreAndRank(models, categories, { provider: 'Anthropic' });
    for (const rec of r.recommendations) {
      expect(rec.model.provider.toLowerCase()).toContain('anthropic');
    }
  });

  test('no candidates survive filters → empty + excluded count', () => {
    const r = scoreAndRank(models, categories, { maxCost: 0.01 });
    expect(r.recommendations).toEqual([]);
    expect(r.excluded).toBe(models.length);
  });
});

describe('scoreAndRank — ranking behavior', () => {
  test('with task=coding the Coding category leader ranks first', () => {
    const coding = categories.find((c) => c.name === 'Coding & Engineering')!;
    const r = scoreAndRank(models, categories, { task: 'coding' });
    expect(r.matchedCategory?.name).toBe('Coding & Engineering');
    expect(r.recommendations[0].model.name).toBe(coding.leader);
    // Leader reason is surfaced.
    expect(r.recommendations[0].reasons.join(' ')).toMatch(/Category leader/);
  });

  test('without a task, recommendations are sorted by score descending', () => {
    const r = scoreAndRank(models, categories, {});
    const scores = r.recommendations.map((x) => x.score);
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);
  });

  test('task that matches no category falls back to the no-task weight path', () => {
    const r = scoreAndRank(models, categories, { task: 'xyzzy-nothing-matches' });
    expect(r.matchedCategory).toBeNull();
    // Still ranks everything; just uses the no-task weights.
    expect(r.recommendations.length).toBeGreaterThan(0);
  });
});


// ─── Unrated models: a borrowed, missing or stale Elo must not move anyone (elo-provenance.md step 4) ───
describe('scoreAndRank — unrated models are excluded from ranking and normalization', () => {
  // Fixture roster: claude and grok are borrowed here regardless of what the live data says today.
  const roster = withBorrowed(models, ['claude', 'grok']);
  const clone = (): Model[] => JSON.parse(JSON.stringify(roster));
  const withElo = (id: string, elo: number): Model[] => clone().map((m) => (m.id === id ? { ...m, elo } : m));
  const view = (r: ReturnType<typeof scoreAndRank>) => r.recommendations.map((x) => [x.model.id, x.score]);
  const borrowed = ['claude', 'grok'];

  test('the live roster: rated and unrated together account for every model, whichever are borrowed today', () => {
    const r = scoreAndRank(models, categories, {}); // the LIVE roster, not the fixture
    expect(r.unrated.map((u) => u.model.id).sort()).toEqual(borrowedIds(models));
    expect(r.recommendations.length + r.unrated.length).toBe(models.length);
  });

  test('1. a predecessor score cannot move anyone: order and scores are identical at Elo 1000 and 2000', () => {
    for (const id of borrowed) {
      const base = view(scoreAndRank(roster, categories, {}));
      const low = view(scoreAndRank(withElo(id, 1000), categories, {}));
      const high = view(scoreAndRank(withElo(id, 2000), categories, {}));
      expect(low).toEqual(base);
      expect(high).toEqual(base);
    }
  });

  test('1b. the same holds with a task and filters', () => {
    const opts = { task: 'coding', maxCost: 20, minContext: 500000 };
    const base = view(scoreAndRank(roster, categories, opts));
    expect(view(scoreAndRank(withElo('claude', 2500), categories, opts))).toEqual(base);
  });

  test('2. normalization: with a borrowed model as the highest Elo, the top rated model is still "Highest Elo"', () => {
    const r = scoreAndRank(withElo('claude', 2500), categories, {});
    const fable = r.recommendations.find((x) => x.model.id === 'fable')!;
    expect(fable.reasons.join(' ')).toMatch(/Highest Elo \(1498\)/);
    expect(r.recommendations.map((x) => x.model.id)).not.toContain('claude');
  });

  test('3. a missing, stale or absent elo_source is unrated, reported with a reason, and excluded is unchanged', () => {
    const baseline = scoreAndRank(roster, categories, {});
    for (const [mutate, reason] of [
      [(m: Model) => { m.elo_source = { ...m.elo_source!, status: 'missing' }; }, 'missing_score'],
      [(m: Model) => { m.elo_source = { ...m.elo_source!, status: 'stale' }; }, 'stale_score'],
      [(m: Model) => { delete m.elo_source; }, 'missing_score'],
    ] as const) {
      const ms = clone();
      const target = ms.find((m) => m.id === 'gemini')!;
      mutate(target);
      const r = scoreAndRank(ms, categories, {});
      expect(r.recommendations.map((x) => x.model.id)).not.toContain('gemini');
      expect(r.unrated.find((u) => u.model.id === 'gemini')?.reason).toBe(reason);
      expect(r.excluded).toBe(baseline.excluded);
    }
  });

  test('borrowed models are reported with reason borrowed_score and the Arena slug', () => {
    const r = scoreAndRank(roster, categories, {});
    const u = r.unrated.find((x) => x.model.id === 'claude')!;
    expect(u.reason).toBe('borrowed_score');
    expect(u.arena_model).toBe('claude-predecessor-slug');
    expect(r.recommendations.length + r.unrated.length).toBe(roster.length);
  });

  test('4. an empty rated set gives no recommendations, everything unrated, no NaN', () => {
    const ms = clone().map((m) => ({ ...m, elo_source: { ...m.elo_source!, status: 'stale' as const } }));
    const r = scoreAndRank(ms, categories, { task: 'coding' });
    expect(r.recommendations).toEqual([]);
    expect(r.unrated).toHaveLength(ms.length);
    expect(JSON.stringify(r)).not.toMatch(/NaN|null,"score"/);
  });

  test('5. an unrated category leader earns nobody the leader bonus, and the response says why', () => {
    const ms = clone().map((m) => (m.id === 'fable' ? { ...m, elo_source: { ...m.elo_source!, status: 'missing' as const } } : m));
    const r = scoreAndRank(ms, categories, { task: 'coding' });
    expect(r.matchedCategory?.leader).toBe('Claude Fable 5.1');
    expect(r.recommendations.some((x) => x.reasons.join(' ').includes('Category leader'))).toBe(false);
    expect(r.notes.join(' ')).toMatch(/leader .*not yet rated|unrated/i);
  });

  test('a hard filter still removes an unrated model from both lists and counts it as excluded', () => {
    const r = scoreAndRank(roster, categories, { provider: 'xAI' });
    expect(r.recommendations).toEqual([]);
    expect(r.unrated.map((u) => u.model.id)).toEqual(['grok']);
    const cheap = scoreAndRank(roster, categories, { maxCost: 0.01 });
    expect(cheap.unrated).toEqual([]);
    expect(cheap.excluded).toBe(roster.length);
  });

  test('7. policy switch: allowing borrowed scores changes the output, so the exclusion is what protects the order', () => {
    const before = view(scoreAndRank(roster, categories, {}));
    RATING_POLICY.includeBorrowed = true;
    try {
      const after = view(scoreAndRank(roster, categories, {}));
      expect(after).not.toEqual(before);
      expect(after.map((x) => x[0])).toContain('claude');
      expect(isRated(roster.find((m) => m.id === 'claude')!)).toBe(true);
    } finally {
      RATING_POLICY.includeBorrowed = false;
    }
    expect(isRated(roster.find((m) => m.id === 'claude')!)).toBe(false);
  });
});
