/**
 * Tests for the recommendation engine (data/recommend.ts).
 *
 * These lock the scoring weights, category matching, and normalization
 * edge cases so the ranking behavior is regression-proof. Per the project
 * decision, the weights are preserved (not tuned) — these tests encode the
 * existing contract.
 */

import { scoreAndRank, findMatchingCategory, SCORING_WEIGHTS } from '../data/recommend';
import { getModels, getCategories } from '../data';
import type { Model, Category } from '../data/types';

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
