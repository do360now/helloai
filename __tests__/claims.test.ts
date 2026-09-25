/**
 * Drift guard for hand-written claims (docs/review/claims-guard.md).
 *
 * models.json `desc` and categories.json `insight` are prose that no script checks. Any number with a
 * percent sign, and any named benchmark, must be registered in data/claims.json with its subject.
 * A registered claim may be `unverified` (found, not yet opened and confirmed by a person); the
 * number of those can only go down, so unverified claims cannot pile up silently.
 */
import { getModels, getCategories, getClaims } from '../data';
import type { Claim } from '../data/types';

// Percentages, multipliers ("2.5x", "double"), named benchmarks, and Elo-range numbers (1400-1999),
// which are the most change-prone figures in the prose.
const CLAIM_LIKE = /\b\d+(\.\d+)?\s?%|\b\d+(\.\d+)?x\b|\bdouble\b|\btriple\b|\bhalf\b|\b1[4-9]\d{2}\b|ARC-AGI|GPQA|SWE-bench|Terminal-Bench|MMLU|\bHLE\b|AIME/g;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_AGE_DAYS = { 'vendor-reported': 30, independent: 60, 'first-party': 60 } as const;
// Ratchet: lower this as claims get confirmed. Raising it needs a reason in the commit message.
// 15 = the first registration after the scan also started covering `tag`, multipliers and Elo-range numbers.
const MAX_UNVERIFIED = 15;

const claims = getClaims();
const prose: Array<{ where: string; subject: string; text: string }> = [
  ...getModels().map((m) => ({ where: `models.json (${m.name}) desc`, subject: m.name, text: m.desc })),
  // The tag is shown on the card and is the most visible form of a claim ("40% Cheaper").
  ...getModels().map((m) => ({ where: `models.json (${m.name}) tag`, subject: m.name, text: m.tag })),
  ...getCategories().map((c) => ({ where: `categories.json (${c.name}) insight`, subject: c.name, text: c.insight })),
];

describe('claims registry', () => {
  test('every claim has an id, text, subject, kind and a verification state', () => {
    for (const c of claims) {
      expect(c.id).toBeTruthy();
      expect(c.text).toBeTruthy();
      expect(c.subject).toBeTruthy();
      expect(Object.keys(MAX_AGE_DAYS)).toContain(c.kind);
      expect(['unverified', 'confirmed']).toContain(c.verification);
    }
    expect(new Set(claims.map((c) => c.id)).size).toBe(claims.length);
  });

  test('a confirmed claim has an https source, an as_of date and a checked_at; only perishable ones expire', () => {
    const bad: string[] = [];
    for (const c of claims.filter((x) => x.verification === 'confirmed')) {
      if (!c.source_url?.startsWith('https://') || !c.as_of || !c.checked_at) {
        bad.push(`${c.id}: confirmed needs source_url (https), as_of and checked_at`);
        continue;
      }
      // A launch-dated figure ("77.1% on ARC-AGI-2 as of 2026-02-19") does not change, so as_of already
      // makes it honest and re-checking it only invites bumping checked_at by hand. Only claims that can
      // change ("leads on...", ranks, prices, Arena numbers) are marked perishable and expire.
      if (!c.perishable) continue;
      const age = (Date.now() - new Date(`${c.checked_at}T00:00:00Z`).getTime()) / DAY_MS;
      if (age > MAX_AGE_DAYS[c.kind]) bad.push(`${c.id}: checked ${Math.floor(age)} days ago (limit ${MAX_AGE_DAYS[c.kind]})`);
    }
    expect(bad).toEqual([]);
  });

  test('an unverified claim never pretends to have been checked', () => {
    for (const c of claims.filter((x) => x.verification === 'unverified')) {
      expect(c.checked_at ?? null).toBeNull();
    }
  });

  test('unverified claims can only go down (ratchet)', () => {
    expect(claims.filter((c) => c.verification === 'unverified').length).toBeLessThanOrEqual(MAX_UNVERIFIED);
  });

  test('every registered claim still appears in the prose of its subject (no dead entries)', () => {
    const dead = claims.filter((c) => !prose.some((p) => p.subject === c.subject && p.text.includes(c.text)));
    expect(dead.map((c) => `${c.id}: "${c.text}" not found in ${c.subject}`)).toEqual([]);
  });
});

describe('claims in prose', () => {
  test('multipliers and Elo-range numbers are detected (self-test)', () => {
    expect('double its predecessor, 2.5x, at 1793'.match(CLAIM_LIKE)).toEqual(['double', '2.5x', '1793']);
    expect('$10/$50 with 1M context'.match(CLAIM_LIKE)).toBeNull();
  });

  test('a price written in a desc still matches the model\'s cost fields (input and output)', () => {
    const drift: string[] = [];
    for (const m of getModels()) {
      const pairs = [...m.desc.matchAll(/\$(\d+(?:\.\d+)?)\/\$?(\d+(?:\.\d+)?)/g)].map((x) => [Number(x[1]), Number(x[2])]);
      if (pairs.length === 0) continue;
      const own = pairs.some(([a, b]) => a === m.cost_per_million_tokens && b === m.cost_per_million_tokens_output);
      if (!own) drift.push(`${m.name}: desc prices ${JSON.stringify(pairs)} vs fields ${m.cost_per_million_tokens}/${m.cost_per_million_tokens_output}`);
    }
    expect(drift).toEqual([]);
  });

  test('every percentage and named benchmark in desc/insight is registered for that subject', () => {
    const unregistered: string[] = [];
    for (const p of prose) {
      let rest = p.text;
      for (const c of claims.filter((x) => x.subject === p.subject)) rest = rest.split(c.text).join(' ');
      for (const hit of rest.match(CLAIM_LIKE) ?? []) unregistered.push(`${p.where}: "${hit}"`);
    }
    expect(unregistered).toEqual([]);
  });

  test('the guard really detects an unregistered claim (self-test)', () => {
    const fake: Claim[] = [];
    const text = 'Scored 91% on MMLU.';
    let rest = text;
    for (const c of fake) rest = rest.split(c.text).join(' ');
    expect(rest.match(CLAIM_LIKE)).toEqual(['91%', 'MMLU']);
  });
});
