/** Level exam sections, Goethe-style. */
export type Section = "Hören" | "Lesen" | "Sprachbausteine" | "Schreiben" | "Sprechen";
export type Scores = Record<Section, [number, number]>;

const share = ([points, of]: [number, number]) => points / Math.max(of, 1);

/**
 * Every section counts the same, as in the Goethe exam. Writing and speaking are self-marked,
 * so they can only lower the result: each checked section must reach the mark on its own.
 * A section with nothing in it (Quiet mode skips writing and speaking) doesn't count.
 */
export function examPercent(score: Scores): number {
  const all = Object.values(score)
    .filter(([, of]) => of > 0)
    .map(share);

  const mean = all.reduce((a, b) => a + b, 0) / all.length;
  const weakest = Math.min(...[score.Hören, score.Lesen, score.Sprachbausteine].map(share));
  return Math.round(100 * Math.min(mean, weakest));
}
