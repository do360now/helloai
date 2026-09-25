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

const CLAIM_LIKE = /\b\d+(\.\d+)?\s?%|ARC-AGI|GPQA|SWE-bench|Terminal-Bench|MMLU|\bHLE\b|AIME/g;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_AGE_DAYS = { 'vendor-reported': 30, independent: 60, 'first-party': 60 } as const;
// Ratchet: lower this as claims get confirmed. Raising it needs a reason in the commit message.
const MAX_UNVERIFIED = 6;

const claims = getClaims();
const prose: Array<{ where: string; subject: string; text: string }> = [
  ...getModels().map((m) => ({ where: `models.json (${m.name}) desc`, subject: m.name, text: m.desc })),
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

  test('a confirmed claim has an https source, an as_of date and a recent checked_at', () => {
    const bad: string[] = [];
    for (const c of claims.filter((x) => x.verification === 'confirmed')) {
      if (!c.source_url?.startsWith('https://') || !c.as_of || !c.checked_at) {
        bad.push(`${c.id}: confirmed needs source_url (https), as_of and checked_at`);
        continue;
      }
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
