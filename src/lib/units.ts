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

/** A short everyday dialogue or text in the unit's situation, heard first, then read. */
const Listening = z.object({
  title: z.string(),
  intro: z.string().describe("one English sentence setting the scene"),
  lines: z
    .array(z.object({ speaker: z.string(), de: z.string(), en: z.string() }))
    .min(6)
    .max(16),
  questions: z
    .array(
      z.object({
        q: z.string().describe("comprehension question in English"),
        options: z.array(z.string()).min(2).max(4),
        answer: z.number().int(),
      }),
    )
    .min(3)
    .max(5),
});

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
  listening: Listening,
  dictation: z.array(z.string()).min(3).max(5).describe("short sentences to hear and type"),
  speaking: z
    .array(z.object({ de: z.string(), en: z.string() }))
    .min(4)
    .max(6)
    .describe("useful lines to listen to, repeat and record"),
  writing: z.object({
    task: z.string().describe("a short everyday writing task in English, 2–4 sentences to write"),
    model: z.string().describe("a model answer in German at the unit's level"),
  }),
});
export type Unit = z.infer<typeof Unit>;

/** The course A1 → B1: grammar in the order everyday life needs it. */
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
  {
    id: "a2-01",
    topic: "Perfekt of separable and inseparable verbs (ge- or not)",
    situation: "Telling what happened at work",
  },
  {
    id: "a2-02",
    topic: "Präteritum of sein, haben and the modal verbs",
    situation: "Talking about your childhood",
  },
  {
    id: "a2-03",
    topic: "the dative: articles, dative plural -n, verbs with a dative object",
    situation: "Giving presents",
  },
  {
    id: "a2-04",
    topic: "two-way prepositions: wo? + dative, wohin? + accusative",
    situation: "Furnishing your flat",
  },
  {
    id: "a2-05",
    topic: "stellen/stehen, legen/liegen, hängen",
    situation: "Tidying up and moving in",
  },
  {
    id: "a2-06",
    topic: "reflexive verbs (sich waschen, sich freuen, sich treffen)",
    situation: "Daily routine and feelings",
  },
  {
    id: "a2-07",
    topic: "weil and dass clauses, verb at the end",
    situation: "Giving reasons at work",
  },
  { id: "a2-08", topic: "wenn and als clauses", situation: "Habits now and memories" },
  {
    id: "a2-09",
    topic: "comparative and superlative",
    situation: "Comparing offers when shopping",
  },
  {
    id: "a2-10",
    topic: "adjective endings after der/die/das",
    situation: "Clothes and things in a shop",
  },
  { id: "a2-11", topic: "adjective endings after ein/kein/mein", situation: "Describing people" },
  {
    id: "a2-12",
    topic: "verbs with prepositions (warten auf, sich freuen auf/über, denken an)",
    situation: "Plans and feelings",
  },
  { id: "a2-13", topic: "wo- and da-words (worauf? darauf)", situation: "Asking about interests" },
  { id: "a2-14", topic: "werden: future and changes", situation: "Plans for the future" },
  {
    id: "a2-15",
    topic: "infinitive with zu (Lust haben, versuchen, anfangen)",
    situation: "Hobbies and plans",
  },
  {
    id: "a2-16",
    topic: "deshalb, trotzdem, denn: connecting sentences",
    situation: "Consequences and contrasts",
  },
  {
    id: "a2-17",
    topic: "indirect questions with ob and question words",
    situation: "Asking politely at an office",
  },
  {
    id: "a2-18",
    topic: "polite Konjunktiv II: hätte gern, könnten Sie, würde",
    situation: "Polite requests",
  },
  {
    id: "a2-19",
    topic: "man, jemand, niemand, etwas, nichts, alle",
    situation: "Rules and instructions",
  },
  {
    id: "a2-20",
    topic: "spoken German with friends: du, particles doch/mal/halt/ja, short forms",
    situation: "Chatting with friends",
  },
  { id: "b1-01", topic: "Präteritum of regular and irregular verbs", situation: "Telling a story" },
  { id: "b1-02", topic: "Plusquamperfekt and nachdem", situation: "What happened before what" },
  {
    id: "b1-03",
    topic: "relative clauses (der/die/das, with prepositions)",
    situation: "Describing people and things",
  },
  {
    id: "b1-04",
    topic: "the passive in the present (wird gemacht)",
    situation: "How things work at the Bürgeramt",
  },
  {
    id: "b1-05",
    topic: "the passive in the past and with modal verbs",
    situation: "Reporting repairs and incidents",
  },
  {
    id: "b1-06",
    topic: "Konjunktiv II: wishes and if-sentences (wenn ich … hätte/wäre/würde)",
    situation: "Dreams and advice",
  },
  {
    id: "b1-07",
    topic: "Konjunktiv II in the past (hätte … gemacht, wäre … gegangen)",
    situation: "Regrets and missed chances",
  },
  {
    id: "b1-08",
    topic: "adjective endings without an article, and the full table",
    situation: "Ads and descriptions",
  },
  { id: "b1-09", topic: "the genitive and wegen, trotz, während", situation: "Official letters" },
  {
    id: "b1-10",
    topic: "entweder…oder, sowohl…als auch, weder…noch, je…desto",
    situation: "Weighing options",
  },
  {
    id: "b1-11",
    topic: "obwohl, während, bevor, seitdem, bis",
    situation: "Contrasts and timelines",
  },
  { id: "b1-12", topic: "um…zu and damit", situation: "Purposes at work" },
  {
    id: "b1-13",
    topic: "the n-declension (der Kunde, den Kunden)",
    situation: "Dealing with customers and colleagues",
  },
  {
    id: "b1-14",
    topic: "lassen (sich die Haare schneiden lassen)",
    situation: "Services and appointments",
  },
  {
    id: "b1-15",
    topic: "nouns from verbs and fixed noun-verb pairs (einen Antrag stellen)",
    situation: "Behörden language",
  },
  {
    id: "b1-16",
    topic: "reporting speech: sagen, dass…, fragen, ob…; recognising Konjunktiv I",
    situation: "Passing on messages",
  },
  { id: "b1-17", topic: "statt…zu, ohne…zu", situation: "Doing things differently" },
  {
    id: "b1-18",
    topic: "reflexive verbs with prepositions (sich erinnern an, sich kümmern um)",
    situation: "Memories and responsibilities",
  },
  {
    id: "b1-19",
    topic: "formal emails: greeting, subject, polite phrases",
    situation: "Complaints and requests in writing",
  },
  {
    id: "b1-20",
    topic: "giving opinions: meiner Meinung nach, einerseits…andererseits",
    situation: "Discussing and disagreeing politely",
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
  for (const [i, question] of unit.listening.questions.entries()) {
    if (!question.options[question.answer]) problems.push(`question ${i + 1}: answer out of range`);
  }
  return problems;
}

/** Tiles are compared without punctuation or capitals: "Ich" can come second in a sentence. */
const bare = (text: string) =>
  text
    .replace(/[.!?,]/g, "")
    .trim()
    .toLowerCase();

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
