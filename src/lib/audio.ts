import type { UnitItem } from "./units";

/**
 * Lesson and exam sentences have a recorded voice (generated once by scripts/gen-audio.ts),
 * stored as a/<key>.m4a on the public Blob store. Anything else uses the phone's voice.
 */
export const AUDIO_BASE = "https://kaxaeswegr2oz4a9.public.blob.vercel-storage.com";

export const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

/** cyrb53: a 53-bit string hash, plenty to name a few thousand sentences without clashes. */
export function audioKey(text: string): string {
  const s = normalize(text);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export const audioUrl = (text: string) => `${AUDIO_BASE}/a/${audioKey(text)}.m4a`;

/** An exercise's sentence with the gap filled in, for feedback and speech. */
export function solved(item: UnitItem): string {
  if (item.type === "order") return item.answers[0] ?? "";
  const answer = item.type === "cloze" ? item.answers[0] : item.options[item.answer];
  return item.de.replace("___", answer ?? "");
}
