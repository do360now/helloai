/**
 * Data integrity tests for open_weight_models.json
 */

import { getModels, getCategories, getOpenWeightModels } from '../data';

describe('Open Weight Models', () => {
  const models = getOpenWeightModels();
  const frontierModels = getModels();
  const categories = getCategories();
  const categoryNames = new Set(categories.map((c) => c.name));
  const frontierIds = new Set(frontierModels.map((m) => m.id));

  test('has between 3 and 6 models', () => {
    expect(models.length).toBeGreaterThanOrEqual(3);
    expect(models.length).toBeLessThanOrEqual(6);
  });

  test('each model has required fields', () => {
    for (const m of models) {
      expect(m.id).toMatch(/^[a-z0-9]+$/);
      expect(m.name).toBeTruthy();
      expect(m.provider).toBeTruthy();
      expect(m.url).toMatch(/^https:\/\//);
      expect(m.tag).toBeTruthy();
      expect(m.desc).toBeTruthy();
      expect(m.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(m.elo).toBeGreaterThanOrEqual(1000);
      expect(m.elo).toBeLessThanOrEqual(2000);
      expect(m.context_window).toBeGreaterThanOrEqual(4096);
      expect(m.params_b).toBeGreaterThan(0);
      expect(m.vram_gb).toBeGreaterThan(0);
      expect(m.tokens_per_sec).toBeGreaterThan(0);
      expect(m.quantization.length).toBeGreaterThan(0);
      expect(m.reference_hardware).toBeTruthy();
      expect(m.license).toBeTruthy();
      expect(Array.isArray(m.strengths)).toBe(true);
    }
  });

  test('model IDs are unique and do not collide with frontier models', () => {
    const ids = models.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(frontierIds.has(id)).toBe(false);
    }
  });

  test('models are sorted by Elo descending', () => {
    for (let i = 1; i < models.length; i++) {
      expect(models[i - 1].elo).toBeGreaterThanOrEqual(models[i].elo);
    }
  });

  test('every strength matches an existing category name', () => {
    const offenders: string[] = [];
    for (const m of models) {
      for (const s of m.strengths) {
        if (!categoryNames.has(s)) {
          offenders.push(`${m.name} → strength "${s}"`);
        }
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        `Open-weight strengths reference unknown categories: ${offenders.join('; ')}`
      );
    }
    expect(offenders).toEqual([]);
  });
});