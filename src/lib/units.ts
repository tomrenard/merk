import { z } from "zod";

/**
 * A grammar unit: a short explanation tied to an everyday situation, examples, and a pool of
 * auto-checked exercises. Content lives in data/units/<id>.json (generated once, committed).
 */
const Item = z.discriminatedUnion("type", [
  // One gap, with the base form given, so there is one right answer: "Ich ___ (sein) müde."
  z.object({
    id: z.string(),
    type: z.literal("cloze"),
    de: z.string().describe('German sentence with exactly one "___" gap'),
    base: z.string().describe("the base form to put in the gap, e.g. sein"),
    answers: z.array(z.string()).min(1),
    en: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("choice"),
    de: z.string().describe('German sentence with exactly one "___" gap'),
    options: z.array(z.string()).min(2).max(4),
    answer: z.number().int().describe("index of the right option"),
    why: z.string().describe("one short English sentence explaining the answer"),
    en: z.string(),
  }),
  // Tap the words into order; every accepted order is listed.
  z.object({
    id: z.string(),
    type: z.literal("order"),
    tiles: z.array(z.string()).min(3).max(8),
    answers: z.array(z.string()).min(1).describe("full sentences, tiles joined by spaces"),
    en: z.string(),
  }),
]);
export type UnitItem = z.infer<typeof Item>;

export const Unit = z.object({
  id: z.string(),
  cefr: z.enum(["A1", "A2", "B1"]),
  title: z.string(),
  situation: z.string(),
  canDo: z.string().describe("what you can do after this unit, one English sentence"),
  explanation: z
    .string()
    .describe("at most 250 words, plain English, may contain a markdown table"),
  french: z.string().describe("one sentence comparing with French, or empty"),
  examples: z
    .array(z.object({ de: z.string(), en: z.string() }))
    .min(4)
    .max(10),
  items: z.array(Item).min(18),
});
export type Unit = z.infer<typeof Unit>;

/** The A1 course: grammar in the order everyday life needs it. */
export const SYLLABUS = [
  { id: "a1-01", topic: "sein and personal pronouns", situation: "Introducing yourself" },
  {
    id: "a1-02",
    topic: "present tense of regular verbs (wohnen, arbeiten, lernen, heißen)",
    situation: "Talking about yourself",
  },
  {
    id: "a1-03",
    topic: "W-questions and verb-second word order",
    situation: "Asking someone about themselves",
  },
  { id: "a1-04", topic: "yes/no questions and nicht", situation: "At the café" },
  {
    id: "a1-05",
    topic: "gender and articles (der/die/das, ein/eine)",
    situation: "Things in your flat",
  },
  { id: "a1-06", topic: "noun plurals", situation: "Shopping list" },
  {
    id: "a1-07",
    topic: "haben and the accusative (den/einen)",
    situation: "Saying what you have and need",
  },
  { id: "a1-08", topic: "kein vs nicht", situation: "At the supermarket" },
  {
    id: "a1-09",
    topic: "present tense of irregular verbs (fahren, essen, sehen, nehmen, lesen)",
    situation: "Getting around town",
  },
  {
    id: "a1-10",
    topic: "possessive articles (mein, dein, sein, ihr, Ihr)",
    situation: "Talking about family",
  },
  {
    id: "a1-11",
    topic: "modal verbs können and müssen, verb at the end",
    situation: "Appointments and obligations",
  },
  { id: "a1-12", topic: "möchten and wollen", situation: "Ordering and saying what you want" },
  {
    id: "a1-13",
    topic: "separable verbs (aufstehen, einkaufen, anrufen)",
    situation: "Your daily routine",
  },
  { id: "a1-14", topic: "time: um, am, im, clock times, days", situation: "Making an appointment" },
  {
    id: "a1-15",
    topic: "the imperative (Sie and du forms)",
    situation: "Instructions and directions",
  },
  {
    id: "a1-16",
    topic: "places: in/zu/nach/bei with the dative (zum, zur, im, beim)",
    situation: "Where you go and where you are",
  },
  {
    id: "a1-17",
    topic: "dative pronouns mir/dir/Ihnen with gefallen, helfen, schmecken",
    situation: "Likes and asking for help",
  },
  { id: "a1-18", topic: "Perfekt with haben", situation: "Talking about your weekend" },
  {
    id: "a1-19",
    topic: "Perfekt with sein (movement and change)",
    situation: "Telling about a trip",
  },
  {
    id: "a1-20",
    topic: "connecting sentences: und, aber, oder, denn; time first (inversion)",
    situation: "Writing a short message to a friend",
  },
] as const;

/**
 * Checks a unit beyond its shape: every gap marked once, choice answers in range, order tiles
 * that rebuild each accepted answer, unique item ids. Returns the problems found.
 */
export function unitProblems(unit: Unit): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const item of unit.items) {
    if (ids.has(item.id)) problems.push(`${item.id}: duplicate id`);
    ids.add(item.id);
    if (item.type !== "order" && item.de.split("___").length !== 2) {
      problems.push(`${item.id}: needs exactly one ___ gap`);
    }
    if (item.type === "choice" && !item.options[item.answer])
      problems.push(`${item.id}: answer out of range`);
    if (item.type === "order") {
      for (const answer of item.answers) {
        if (!buildsFrom(answer, item.tiles))
          problems.push(`${item.id}: "${answer}" is not made of the tiles`);
      }
    }
  }
  return problems;
}

const bare = (text: string) => text.replace(/[.!?,]/g, "").trim();

/** True if `sentence` is exactly all `tiles`, each used once, in some order, joined by spaces. */
export function buildsFrom(sentence: string, tiles: readonly string[]): boolean {
  const rest = bare(sentence);
  if (!tiles.length) return rest === "";
  return tiles.some((tile, i) => {
    const t = bare(tile);
    if (rest !== t && !rest.startsWith(`${t} `)) return false;
    return buildsFrom(
      rest.slice(t.length).trim(),
      tiles.filter((_, j) => j !== i),
    );
  });
}
