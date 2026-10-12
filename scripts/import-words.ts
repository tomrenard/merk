/**
 * Loads the word lists A1 (+ core words) → A2 → B1, one note per word (the earliest level wins).
 * A1/core/A2 get both card directions, B1 only German→English (recognition). Within a level, new
 * words come in frequency order (DeReWo, fetched into the cache). Safe to re-run: notes update in
 * place, started cards and their history are never removed.
 * Sources and licences: data/README.md. B1 English comes from Claude via AI Gateway once
 * (AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN from `vercel env pull .env.vercel`), then from cache.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { and, eq, isNotNull, isNull, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { connect } from "../src/db/client.ts";
import { cards, notes } from "../src/db/schema.ts";
import { lemmaKeys } from "../src/lib/german.ts";
import { frequencyOrder, parseB1Line, parseRanks } from "../src/lib/wordlists.ts";

type Note = typeof notes.$inferInsert;

const DATA = new URL("../data/", import.meta.url).pathname;
const CACHE = `${DATA}.cache/`;
mkdirSync(CACHE, { recursive: true });

function fetchRepo(name: string, url: string): string {
  const dir = `${CACHE}${name}`;
  if (!existsSync(dir)) execFileSync("git", ["clone", "--quiet", "--depth", "1", url, dir]);
  return dir;
}

const seen = new Set<string>();

/** False when any spelling of the word is already in an earlier level or earlier in this one. */
function isNewWord(de: string): boolean {
  const keys = lemmaKeys(de);
  if (!keys.length || keys.some((key) => seen.has(key))) return false;
  for (const key of keys) seen.add(key);
  return true;
}

const orNull = (value: string | undefined | null) => value?.trim() || null;

/** Columns: anki id, German, example DE, English, example EN, hint, (unused), audio. */
function a1Notes(): Note[] {
  const pairs = new Set<string>();
  return readFileSync(`${DATA}goethe-a1.tsv`, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line, ord) => {
      const [id, de, exampleDe, en, exampleEn, hint] = line.split("\t");
      if (!id || !de || !en) throw new Error(`Bad A1 row ${ord + 1}: ${line}`);
      // Several A1 notes are senses of one word ("auf": on / until / in): those stay. A word
      // repeated with the same English only differs by its example, so it is dropped.
      const pair = `${de.trim()}\t${en.trim()}`;
      if (pairs.has(pair)) return null;
      pairs.add(pair);
      for (const key of lemmaKeys(de)) seen.add(key);
      return {
        id: `goethe-a1:${id}`,
        source: "goethe-a1",
        cefr: "A1",
        ord,
        // This deck writes umlaut plurals as "-ä, e" or "-Ä"; the other lists use "-̈e".
        de: de.trim().replace(/, -[äöüÄÖÜ](?:, (\p{L}+))?$/u, ", -̈$1"),
        exampleDe: orNull(exampleDe),
        en: en.trim(),
        exampleEn: orNull(exampleEn),
        hint: orNull(hint),
      };
    })
    .filter((note) => note !== null);
}

/** Hand-written words the Goethe lists keep in topic groups (numbers, days, months…). */
function coreNotes(): Note[] {
  return readFileSync(`${DATA}core-words.tsv`, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      const [id = "", de = "", exampleDe, en = "", exampleEn, hint] = line.split("\t");
      return {
        id,
        source: "core",
        cefr: "A1",
        ord: 0,
        de,
        en,
        exampleDe: orNull(exampleDe),
        exampleEn: orNull(exampleEn),
        hint: orNull(hint),
      };
    })
    .filter((note) => isNewWord(note.de));
}

/** DeReWo corpus frequency ranks (CC BY-NC, fetched, never committed): key → rank. */
function frequencyRanks(): Map<string, number> {
  const name = "derewo-v-ww-bll-320000g-2012-12-31-1.0";
  const file = `${CACHE}derewo/${name}.txt`;
  if (!existsSync(file)) {
    const zip = `${CACHE}derewo.zip`;
    execFileSync("curl", [
      "-sfL",
      "-o",
      zip,
      `https://www.ids-mannheim.de/fileadmin/kl/derewo/${name}.zip`,
    ]);
    execFileSync("unzip", ["-oq", zip, `${name}.txt`, "-d", `${CACHE}derewo`]);
  }
  return parseRanks(new TextDecoder("latin1").decode(readFileSync(file)));
}

function a2Notes(): Note[] {
  const dir = `${fetchRepo("a2", "https://github.com/langfield/A2_Wortliste_Goethe.git")}/A2_Wortliste_Goethe`;
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const text = readFileSync(`${dir}/${file}`, "utf8");
      const field = (name: string) => orNull(text.match(new RegExp(`### ${name}\\n([^#]*)`))?.[1]);
      // This deck writes umlaut plurals as `"-e` or a bare `"`; the other lists use "-̈e".
      const plural = field("Plural")?.replace(/^"-?/, "-̈");
      const word = [field("Artikel"), field("Wort_DE")].filter(Boolean).join(" ");
      return {
        id: `goethe-a2:${text.match(/nid: (\d+)/)?.[1]}`,
        source: "goethe-a2",
        cefr: "A2",
        ord: 10_000 + Number(field("Original_Order") ?? 0),
        de: plural?.startsWith("-") ? `${word}, ${plural}` : word,
        en: field("Wort_EN") ?? "",
        exampleDe: field("Satz1_DE"),
        exampleEn: field("Satz1_EN"),
        hint: [field("Verbformen"), field("Hinweis")].filter(Boolean).join(" · ") || null,
      };
    })
    .filter((note) => note.en && note.id !== "goethe-a2:undefined")
    .sort((a, b) => a.ord - b.ord)
    .filter((note) => isNewWord(note.de));
}

const Translation = z.object({
  items: z.array(
    z.object({ de: z.string(), en: z.string(), example_de: z.string(), example_en: z.string() }),
  ),
});
type Translated = z.infer<typeof Translation>["items"][number];

/** English and one example per headword, from Claude, cached so a re-run costs nothing. */
async function translate(headwords: string[]): Promise<Record<string, Translated>> {
  const cacheFile = `${CACHE}b1-translations.json`;
  const cached: Record<string, Translated> = existsSync(cacheFile)
    ? JSON.parse(readFileSync(cacheFile, "utf8"))
    : {};
  const missing = headwords.filter((de) => !cached[de]);
  if (!missing.length) return cached;
  const client = new Anthropic({
    baseURL: "https://ai-gateway.vercel.sh",
    apiKey: process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN,
  });
  for (let i = 0; i < missing.length; i += 100) {
    const batch = missing.slice(i, i + 100);
    const response = await client.messages.parse({
      model: "anthropic/claude-opus-5.5",
      max_tokens: 16000,
      output_config: { effort: "low", format: zodOutputFormat(Translation) },
      messages: [
        {
          role: "user",
          content: `These are German headwords from the Goethe B1 word list, for a flashcard app. For each one, return:
- de: the headword exactly as given
- en: a short English gloss (the most common meanings, comma-separated, verbs as "to …")
- example_de: one short, natural B1-level German sentence using it
- example_en: its English translation

${batch.join("\n")}`,
        },
      ],
    });
    for (const item of response.parsed_output?.items ?? []) cached[item.de] = item;
    writeFileSync(cacheFile, JSON.stringify(cached, null, 1));
    console.log(`translated ${Math.min(i + 100, missing.length)}/${missing.length}`);
  }
  return cached;
}

async function b1Notes(): Promise<Note[]> {
  const dir = fetchRepo("b1", "https://github.com/kennethsible/goethe-wortliste.git");
  // Verbs come with their forms ("retten, rettet, rettete, hat gerettet"): word first, forms as hint.
  const fresh = readFileSync(`${dir}/sorted.txt`, "utf8")
    .split("\n")
    .flatMap((line, rank) => {
      const entry = parseB1Line(line);
      return entry && isNewWord(entry.de) ? [{ ...entry, rank }] : [];
    });
  const translations = await translate(fresh.map((entry) => entry.de));
  return fresh.flatMap(({ de, hint, rank }) => {
    const t = translations[de];
    if (!t) return [];
    return [
      {
        id: `goethe-b1:${lemmaKeys(de)[0]}`,
        source: "goethe-b1",
        cefr: "B1",
        ord: 200_000 + rank,
        de,
        en: t.en,
        exampleDe: t.example_de,
        exampleEn: t.example_en,
        hint,
      },
    ];
  });
}

const ranks = frequencyRanks();
// Order of the list = teaching order: A1 and core words together, then A2; B1 is already by frequency.
const ordered = (list: Note[], base: number) =>
  frequencyOrder(list, ranks).map((note, i) => ({ ...note, ord: base + i }));
const a1 = [...a1Notes(), ...coreNotes()];
const words = [...ordered(a1, 0), ...ordered(a2Notes(), 100_000), ...(await b1Notes())];
/** B1 is for recognition: no English→German card. */
const directions = (note: Note) =>
  note.cefr === "B1" ? (["de_en"] as const) : (["de_en", "en_de"] as const);
const db = connect();
const before = await db.$count(notes);
const introducedBefore = await db.$count(cards, isNotNull(cards.introducedAt));
// One transaction: a failure half-way leaves the deck as it was.
const dropped = await db.transaction(async (tx) => {
  await tx
    .insert(notes)
    .values(words)
    .onConflictDoUpdate({
      target: notes.id,
      set: {
        de: sql`excluded.de`,
        en: sql`excluded.en`,
        exampleDe: sql`excluded.example_de`,
        exampleEn: sql`excluded.example_en`,
        hint: sql`excluded.hint`,
      },
      setWhere: sql`${notes.editedAt} is null`,
    });
  // Order applies to edited notes too: it is teaching order, not content.
  await tx.execute(
    sql`update ${notes} set ord = v.ord from (values ${sql.join(
      words.map((w) => sql`(${w.id}, ${w.ord}::int)`),
      sql`, `,
    )}) as v(id, ord) where ${notes.id} = v.id`,
  );
  // A1 rows dropped as duplicates go, with their cards; edited ones stay. Only A1: the other
  // lists come from upstream repos, and a change there must not wipe your history.
  const a1Ids = words.filter((w) => w.source === "goethe-a1").map((w) => w.id);
  if (!a1Ids.length) throw new Error("No A1 words loaded");
  // Never a note you have started learning: its review history would go with it.
  const removed = await tx
    .delete(notes)
    .where(
      and(
        eq(notes.source, "goethe-a1"),
        notInArray(notes.id, a1Ids),
        isNull(notes.editedAt),
        sql`not exists (select 1 from ${cards} where ${cards.noteId} = ${notes.id} and ${cards.introducedAt} is not null)`,
      ),
    )
    .returning({ id: notes.id });
  await tx
    .insert(cards)
    .values(
      words.flatMap((note) =>
        directions(note).map((direction) => ({
          id: `${note.id}:${direction}`,
          noteId: note.id,
          direction,
        })),
      ),
    )
    .onConflictDoNothing();
  // English→German cards of B1 words you have not started yet (B1 is recognition only).
  await tx.execute(
    sql`delete from ${cards} using ${notes} where ${cards.noteId} = ${notes.id} and ${notes.cefr} = 'B1' and ${cards.direction} = 'en_de' and ${cards.introducedAt} is null`,
  );
  if ((await tx.$count(cards, isNotNull(cards.introducedAt))) !== introducedBefore)
    throw new Error("Started cards changed: import rolled back");
  return removed;
});
const perLevel = ["A1", "A2", "B1"].map((l) => `${l}: ${words.filter((w) => w.cefr === l).length}`);
const added = (await db.$count(notes)) - before + dropped.length;
console.log(`${perLevel.join(", ")} · ${added} new notes, ${dropped.length} removed`);
process.exit(0);
