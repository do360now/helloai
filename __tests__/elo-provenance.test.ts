/**
 * Every displayed Elo must say where it comes from (docs/review/elo-provenance.md).
 * Numbers here are the updater agent's record of the arena.ai text-overall board; a person
 * still has to open the live board to confirm them.
 */
import { getModels } from '../data';

const MAX_SNAPSHOT_AGE_DAYS = 21;
const DAY_MS = 24 * 60 * 60 * 1000;

describe('Elo provenance', () => {
  const models = getModels();

  test.each(models.map((m) => [m.id, m] as const))('%s has a complete elo_source', (_id, m) => {
    const s = m.elo_source;
    expect(s).toBeDefined();
    expect(s!.arena_model).toBeTruthy();
    expect(s!.snapshot_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s!.source_url).toMatch(/^https:\/\/arena\.ai\//);
    expect(['override', 'fetched', 'agent_curated']).toContain(s!.set_by);
    expect(typeof s!.matches_listed_model).toBe('boolean');
  });

  test('the headline Elo of every model comes from the text-overall board', () => {
    for (const m of models) expect(m.elo_source?.board).toBe('text_overall');
  });

  // Two different dates. snapshot_date is what the BOARD says and stays honest even when arena.ai
  // stops publishing. checked_date is when we last looked. The freshness rule applies to OUR checking,
  // so a stalled board never forces anyone to edit a date or mark every model stale.
  test('every model was checked recently (fails at update time, naming the model)', () => {
    const stale: string[] = [];
    for (const m of models) {
      const checked = m.elo_source!.checked_date;
      expect(checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const age = (Date.now() - new Date(`${checked}T00:00:00Z`).getTime()) / DAY_MS;
      if (age > MAX_SNAPSHOT_AGE_DAYS) stale.push(`${m.name} (checked ${checked}, ${Math.floor(age)} days ago)`);
    }
    expect(stale).toEqual([]);
  });

  test('a snapshot is never dated after the day we checked it', () => {
    for (const m of models) {
      const s = m.elo_source!;
      expect(s.snapshot_date <= s.checked_date).toBe(true);
    }
  });

  test('an interval brackets the score when present', () => {
    for (const m of models) {
      const s = m.elo_source!;
      if (s.ci_low !== undefined || s.ci_high !== undefined) {
        expect(s.ci_low).toBeLessThanOrEqual(m.elo);
        expect(s.ci_high).toBeGreaterThanOrEqual(m.elo);
      }
    }
  });

  test("a predecessor's interval or votes are never attached to the listed model", () => {
    for (const m of models) {
      const s = m.elo_source!;
      if (!s.matches_listed_model) {
        expect(s.ci_low).toBeUndefined();
        expect(s.ci_high).toBeUndefined();
        expect(s.votes).toBeUndefined();
      }
    }
  });

  test('the two known borrowed scores are flagged, and everything else matches', () => {
    const borrowed = models.filter((m) => !m.elo_source!.matches_listed_model).map((m) => m.id).sort();
    expect(borrowed).toEqual(['claude', 'grok']);
  });

  test('a matching score names a slug that belongs to the listed model, not a predecessor', () => {
    const bySlug = Object.fromEntries(models.map((m) => [m.id, m.elo_source!.arena_model]));
    expect(bySlug.claude).not.toMatch(/5\.5|5-5/); // Opus 5.5 has no slug of its own on the board
    expect(bySlug.grok).not.toMatch(/4\.7/);
    expect(bySlug.fable).toMatch(/5\.1/);
    expect(bySlug.gemini).toMatch(/3\.1/);
  });
});
