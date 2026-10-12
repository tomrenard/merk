/* Shuffles, kept apart from units.ts so code that runs on the phone doesn't load zod. */

/** A shuffled copy (Fisher–Yates). */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

/**
 * The same "random" order for the same seed, on the server and in the browser alike (a
 * different order on each side breaks React's hydration).
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let state = [...seed].reduce((hash, c) => (Math.imul(hash, 31) + c.charCodeAt(0)) | 0, 7);
  return shuffled(items, () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
}
