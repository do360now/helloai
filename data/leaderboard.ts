/**
 * Elo bar width for the homepage leaderboard.
 * Maps [minElo, maxElo] onto [10%, 100%] so the lowest-ranked model still
 * shows a visible bar and no width can go negative — the previous hardcoded
 * 1480 floor broke as soon as a model dipped below it.
 */
export function eloBarWidth(elo: number, minElo: number, maxElo: number): number {
  if (maxElo === minElo) return 100;
  const clamped = Math.min(Math.max(elo, minElo), maxElo);
  return 10 + ((clamped - minElo) / (maxElo - minElo)) * 90;
}
