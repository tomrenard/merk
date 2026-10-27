import { z } from "zod";

/**
 * A grammar unit: a short explanation tied to an everyday situation, examples, and a pool of
 * auto-checked exercises. Content lives in data/units/<id>.json (generated once, committed).
 *
 * `de` is the target language as written (German, or Darija in Arabic script). Darija lessons
 * add `tr`, the same text in Latin (data/darija/README.md): it is shown under the Arabic and is
 * what typed answers are checked against. Their glosses (`en`) are in French.
 */
const tr = z.string().optional().describe("Darija only: the same text in Latin (Arabizi)");
const Item = z.discriminatedUnion("type", [
  // One gap, with the base form given, so there is one right answer: "Ich ___ (sein) müde."
  z.object({
    id: z.string(),
    type: z.literal("cloze"),
    de: z.string().describe('German sentence with exactly one "___" gap'),
    base: z.string().describe("the base form to put in the gap, e.g. sein"),
    answers: z.array(z.string()).min(1),
    tr,
    /** Darija only: accepted answers in Latin, checked instead of `answers`. */
    answersTr: z.array(z.string()).min(1).optional(),
    en: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("choice"),
    de: z.string().describe('German sentence with exactly one "___" gap'),
    options: z.array(z.string()).min(2).max(4),
    answer: z.number().int().describe("index of the right option"),
    why: z.string().describe("one short English sentence explaining the answer"),
    tr,
    /** Darija only: the options in Latin, in the same order. */
    optionsTr: z.array(z.string()).optional(),
    en: z.string(),
  }),
  // Tap the words into order; every accepted order is listed. Darija tiles are in Latin.
  z.object({
    id: z.string(),
    type: z.literal("order"),
    tiles: z.array(z.string()).min(3).max(8),
    answers: z.array(z.string()).min(1).describe("full sentences, tiles joined by spaces"),
    /** Darija only: the sentence in Arabic script, shown and heard once solved. */
    de: z.string().optional(),
    en: z.string(),
  }),
]);
export type UnitItem = z.infer<typeof Item>;

/** A short everyday dialogue or text in the unit's situation, heard first, then read. */
const Listening = z.object({
  title: z.string(),
  intro: z.string().describe("one English sentence setting the scene"),
  lines: z
    .array(z.object({ speaker: z.string(), de: z.string(), tr, en: z.string() }))
    .min(6)
    .max(30),
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
  cefr: z.enum(["A1", "A2", "B1", "B2"]),
  /** grammar: a rule; topic: a theme's words and phrases; story: a longer text to understand. */
  kind: z.enum(["grammar", "topic", "story"]).default("grammar"),
  /** Topic lessons: the deck's headwords for the theme (exactly as in the word list). */
  words: z.array(z.string()).max(40).optional(),
  title: z.string(),
  /** One emoji for the lesson's situation, shown in the course list. */
  icon: z.string(),
  situation: z.string(),
  canDo: z.string().describe("what you can do after this unit, one English sentence"),
  explanation: z
    .string()
    .describe("at most 250 words, plain English, may contain a markdown table"),
  french: z.string().describe("one sentence comparing with French, or empty"),
  examples: z
    .array(z.object({ de: z.string(), tr, en: z.string() }))
    .min(4)
    .max(10),
  items: z.array(Item).min(18),
  listening: Listening,
  dictation: z.array(z.string()).min(3).max(5).describe("short sentences to hear and type"),
  /** Darija only: the dictation sentences in Latin, in the same order (what you type). */
  dictationTr: z.array(z.string()).optional(),
  speaking: z
    .array(z.object({ de: z.string(), tr, en: z.string() }))
    .min(4)
    .max(6)
    .describe("useful lines to listen to, repeat and record"),
  writing: z.object({
    task: z.string().describe("a short everyday writing task in English, 2–4 sentences to write"),
    model: z.string().describe("a model answer in German at the unit's level"),
    modelTr: tr,
    modelEn: z.string().optional().describe("the model answer in English, sentence by sentence"),
    /** The model one sentence at a time, each with its translation (quiet mode builds them). */
    sentences: z.array(z.object({ de: z.string(), tr, en: z.string() })).optional(),
  }),
});
export type Unit = z.infer<typeof Unit>;

/** Every lesson's topic and situation, by id (grammar units, topic lessons tNN, stories sNN). */
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
  {
    id: "a1-t01",
    topic:
      "Topic: introducing yourself and personal details (name, origin, address, phone, spelling)",
    situation: "Filling in a form at the Bürgeramt",
  },
  { id: "a1-t02", topic: "Topic: food and drinks", situation: "At the bakery and the café" },
  { id: "a1-t03", topic: "Topic: numbers, prices and paying", situation: "At the market" },
  { id: "a1-t04", topic: "Topic: family", situation: "Showing family photos" },
  { id: "a1-t05", topic: "Topic: hobbies and free time", situation: "Getting to know a colleague" },
  { id: "a1-t06", topic: "Topic: clothes and shopping", situation: "In a clothes shop" },
  {
    id: "a1-t07",
    topic: "Topic: the city, directions and public transport",
    situation: "Finding your way",
  },
  { id: "a1-t08", topic: "Topic: weather and seasons", situation: "Small talk about the weather" },
  { id: "a1-t09", topic: "Topic: body and health", situation: "Calling in sick and at the doctor" },
  { id: "a1-t10", topic: "Topic: work and jobs", situation: "Talking about your job" },
  { id: "a2-t01", topic: "Topic: flat hunting and moving", situation: "Viewing a flat" },
  {
    id: "a2-t02",
    topic: "Topic: doctor, pharmacy and health insurance",
    situation: "At the doctor's practice",
  },
  { id: "a2-t03", topic: "Topic: travel, trains and hotels", situation: "Booking a trip" },
  {
    id: "a2-t04",
    topic: "Topic: shopping, returns and complaints",
    situation: "Returning something",
  },
  {
    id: "a2-t05",
    topic: "Topic: celebrations and German holidays",
    situation: "An invitation to a birthday",
  },
  {
    id: "a2-t06",
    topic: "Topic: work life, colleagues and emails",
    situation: "First week at a new job",
  },
  {
    id: "a2-t07",
    topic: "Topic: Bürgeramt, forms and appointments",
    situation: "Registering your address (Anmeldung)",
  },
  {
    id: "a2-t08",
    topic: "Topic: phone, internet and contracts",
    situation: "Getting a mobile contract",
  },
  { id: "a2-t09", topic: "Topic: sport and healthy habits", situation: "Joining a gym or club" },
  {
    id: "a2-t10",
    topic: "Topic: relationships and feelings",
    situation: "Talking about friends and partners",
  },
  { id: "b1-t01", topic: "Topic: job search, CV and interview", situation: "A job interview" },
  {
    id: "b1-t02",
    topic: "Topic: bank, insurance and money",
    situation: "Opening an account and insurance",
  },
  {
    id: "b1-t03",
    topic: "Topic: neighbours, house rules and conflicts",
    situation: "A problem with the neighbours",
  },
  {
    id: "b1-t04",
    topic: "Topic: environment, recycling and Mülltrennung",
    situation: "Sorting the rubbish right",
  },
  { id: "b1-t05", topic: "Topic: news, politics and society", situation: "Talking about the news" },
  {
    id: "b1-t06",
    topic: "Topic: education, courses and the German school system",
    situation: "Choosing a course",
  },
  {
    id: "b1-t07",
    topic: "Topic: tenancy: rent, Nebenkosten, repairs, notice",
    situation: "Writing to the Hausverwaltung",
  },
  {
    id: "b1-t08",
    topic: "Topic: health system: specialists, referrals, hospital",
    situation: "Getting a specialist appointment",
  },
  {
    id: "b1-t09",
    topic: "Topic: workplace rights: contract, holidays, sick leave",
    situation: "Questions about your work contract",
  },
  {
    id: "b1-t10",
    topic: "Topic: culture, films and books",
    situation: "Recommending a film or book",
  },
  {
    id: "b1-t11",
    topic: "Topic: technology and everyday digital life",
    situation: "Helping someone with their phone",
  },
  {
    id: "b1-t12",
    topic: "Topic: food culture, cooking and eating out",
    situation: "Cooking together",
  },
  {
    id: "b1-t13",
    topic: "Topic: travel problems: delays, lost luggage, refunds",
    situation: "Claiming compensation",
  },
  {
    id: "b1-t14",
    topic: "Topic: volunteering and community",
    situation: "Helping in the neighbourhood",
  },
  {
    id: "b1-t15",
    topic: "Topic: living in Germany: culture shock and habits",
    situation: "Comparing France and Germany",
  },
  {
    id: "b1-s01",
    topic: "Story: the first day at a new job",
    situation: "A longer story to understand",
  },
  { id: "b1-s02", topic: "Story: the flat viewing", situation: "A longer story to understand" },
  { id: "b1-s03", topic: "Story: the lost suitcase", situation: "A longer story to understand" },
  {
    id: "b1-s04",
    topic: "Story: the neighbourhood party",
    situation: "A longer story to understand",
  },
  {
    id: "b1-s05",
    topic: "Story: a call to the Ausländerbehörde",
    situation: "A longer story to understand",
  },
  { id: "b1-s06", topic: "Story: a weekend in Hamburg", situation: "A longer story to understand" },
  { id: "b1-s07", topic: "Story: the broken heating", situation: "A longer story to understand" },
  {
    id: "b1-s08",
    topic: "Story: a misunderstanding at the doctor's",
    situation: "A longer story to understand",
  },
  { id: "b1-s09", topic: "Story: the job offer", situation: "A longer story to understand" },
  { id: "b1-s10", topic: "Story: a year in Germany", situation: "A longer story to understand" },
  {
    id: "b2-01",
    topic:
      "the passive with sein (Zustandspassiv) and passive alternatives (man, sich lassen, -bar)",
    situation: "Official notices and instructions",
  },
  { id: "b2-02", topic: "Konjunktiv I for reported speech", situation: "Reading the news" },
  {
    id: "b2-03",
    topic:
      "participles as adjectives (der schlafende Hund, das gekaufte Auto) and extended attributes",
    situation: "Formal texts and descriptions",
  },
  {
    id: "b2-04",
    topic: "modal verbs for assumptions (muss, dürfte, könnte, soll)",
    situation: "Guessing and speculating",
  },
  {
    id: "b2-05",
    topic: "connectors for argument: zwar…aber, dennoch, folglich, außerdem, hingegen",
    situation: "Writing an opinion piece",
  },
  {
    id: "b2-06",
    topic:
      "nominal style: prepositions with the genitive (aufgrund, infolge, hinsichtlich) and nominalisation",
    situation: "Formal letters and reports",
  },
  {
    id: "b2-07",
    topic: "verbs, nouns and adjectives with fixed prepositions (advanced)",
    situation: "Discussing at work",
  },
  {
    id: "b2-08",
    topic: "relative clauses with wer/was/wo(r)+preposition and was after alles/nichts",
    situation: "Explaining precisely",
  },
  {
    id: "b2-09",
    topic: "Konjunktiv II: irrealis with als ob, past and modal forms",
    situation: "Comparing and imagining",
  },
  {
    id: "b2-10",
    topic: "word formation: prefixes and suffixes (-ung, -heit, -keit, -lich, -bar, un-, miss-)",
    situation: "Understanding new words",
  },
  {
    id: "b2-11",
    topic: "subordinate clauses: je nachdem, sofern, falls, indem, sodass",
    situation: "Conditions and consequences",
  },
  {
    id: "b2-12",
    topic: "register: formal vs informal, idioms and fixed expressions",
    situation: "Sounding natural",
  },
  {
    id: "b2-t01",
    topic: "Topic: work: negotiation, meetings and presenting",
    situation: "Presenting at work",
  },
  {
    id: "b2-t02",
    topic: "Topic: housing market and tenancy law",
    situation: "Disputing a rent increase",
  },
  {
    id: "b2-t03",
    topic: "Topic: society: migration, integration and citizenship",
    situation: "Discussing integration",
  },
  {
    id: "b2-t04",
    topic: "Topic: science, technology and the future",
    situation: "Debating new technology",
  },
  {
    id: "b2-t05",
    topic: "Topic: health and the body (advanced)",
    situation: "Discussing a diagnosis",
  },
  {
    id: "b2-s01",
    topic: "Story: a podcast episode about life in Berlin",
    situation: "A longer text to understand",
  },
  {
    id: "b2-s02",
    topic: "Story: a news report and interview",
    situation: "A longer text to understand",
  },
  {
    id: "b2-s03",
    topic: "Story: a short story with a twist",
    situation: "A longer text to understand",
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
  const { model, modelTr, sentences } = unit.writing;
  const joined = (texts: (string | undefined)[]) => texts.join(" ").replace(/\s+/g, " ").trim();
  if (!sentences) problems.push("writing.sentences: missing");
  else if (
    joined(sentences.map((s) => s.de)) !== joined([model]) ||
    (modelTr && joined(sentences.map((s) => s.tr)) !== joined([modelTr]))
  )
    problems.push("writing.sentences: don't add up to the model");
  if (unit.id.startsWith("ary-")) problems.push(...latinProblems(unit));
  return problems;
}

/** A Darija lesson needs the Latin of every Darija text, since typed answers use it. */
function latinProblems(unit: Unit): string[] {
  const problems: string[] = [];
  const texts = [
    ...unit.examples.map((e, i) => [`example ${i + 1}`, e.tr] as const),
    ...unit.listening.lines.map((l, i) => [`line ${i + 1}`, l.tr] as const),
    ...unit.speaking.map((s, i) => [`speaking ${i + 1}`, s.tr] as const),
    ["writing model", unit.writing.modelTr] as const,
  ];
  for (const [where, latin] of texts) if (!latin) problems.push(`${where}: needs tr`);
  // Arabic script only: a French hint inside it would read right to left (put it in `en`).
  const arabic = [
    ...unit.examples.map((e) => e.de),
    ...unit.listening.lines.map((l) => l.de),
    ...unit.speaking.map((s) => s.de),
    ...unit.dictation,
    unit.writing.model,
    ...unit.items.flatMap((item) => (item.type === "order" ? [item.de ?? ""] : [item.de])),
  ];
  for (const text of arabic)
    if (/[a-zà-ÿ]/i.test(text)) problems.push(`"${text}": Latin letters in the Arabic text`);

  if (unit.dictationTr?.length !== unit.dictation.length)
    problems.push("dictationTr: one per dictation sentence");
  for (const item of unit.items) {
    // Exercises are graded by the course their id names.
    if (!item.id.startsWith(`${unit.id}-`))
      problems.push(`${item.id}: id must start with ${unit.id}-`);
    if (item.type === "cloze" && (!item.tr || !item.answersTr))
      problems.push(`${item.id}: needs tr and answersTr`);
    if (item.type === "choice" && (!item.tr || item.optionsTr?.length !== item.options.length))
      problems.push(`${item.id}: needs tr and one optionsTr per option`);
    if (item.type === "order" && !item.de) problems.push(`${item.id}: needs de (Arabic)`);
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
