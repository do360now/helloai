import { snapshotHash, SCORING_VERSION, normalizationBasis } from '../lib/scoring-snapshot';
import { getModels, getCategories, getSiteConfig } from '../data';

describe('scoring snapshot hash', () => {
  const models = getModels();
  const categories = getCategories();
  const last = getSiteConfig().lastUpdated;

  test('has the form sha256:<12 hex> and is stable', () => {
    const h = snapshotHash(models, categories, last);
    expect(h).toMatch(/^sha256:[0-9a-f]{12}$/);
    expect(snapshotHash(models, categories, last)).toBe(h);
  });

  test('changing one Elo value changes the snapshot', () => {
    const changed = JSON.parse(JSON.stringify(models));
    changed[0].elo += 1;
    expect(snapshotHash(changed, categories, last)).not.toBe(snapshotHash(models, categories, last));
  });

  test('reordering object keys does not change it (canonical JSON)', () => {
    const reordered = models.map((m) => Object.fromEntries(Object.entries(m).reverse()));
    expect(snapshotHash(reordered as typeof models, categories, last)).toBe(snapshotHash(models, categories, last));
  });

  test('changing the data date or a category leader changes it', () => {
    const cats = JSON.parse(JSON.stringify(categories));
    cats[0].leader = 'Someone Else';
    expect(snapshotHash(models, cats, last)).not.toBe(snapshotHash(models, categories, last));
    expect(snapshotHash(models, categories, '2099-01-01')).not.toBe(snapshotHash(models, categories, last));
  });

  test('exposes the scoring version and normalization basis', () => {
    expect(SCORING_VERSION).toBe(1);
    expect(normalizationBasis).toBe('all_tracked_models');
  });
});
