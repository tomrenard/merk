/**
 * Loads the word lists A1 → A2 → B1, one note per word (the earliest level wins), both card
 * directions each. Safe to re-run: notes update in place, cards and their history are kept.
 * Sources and licences: data/README.md. B1 English comes from Claude via AI Gateway once
 * (AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN from `vercel env pull .env.vercel`), then from cache.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { and, isNull, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { connect } from "../src/db/client.ts";
import { cards, notes } from "../src/db/schema.ts";
import { lemmaKeys } from "../src/lib/german.ts";

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
    .map((line) => line.trim())
    .filter((line) => line && !line.endsWith("-"))
    .map((line, rank) => {
      const [de = line, ...forms] = /^(der|die|das) /.test(line) ? [line] : line.split(", ");
      return { de, hint: forms.join(", ") || null, rank };
    })
    .filter((entry) => isNewWord(entry.de));
  const translations = await translate(fresh.map((entry) => entry.de));
  return fresh.flatMap(({ de, hint, rank }) => {
    const t = translations[de];
    if (!t) return [];
    return [
      {
        id: `goethe-b1:${lemmaKeys(de)[0]}`,
        source: "goethe-b1",
        cefr: "B1",
        ord: 20_000 + rank,
        de,
        en: t.en,
        exampleDe: t.example_de,
        exampleEn: t.example_en,
        hint,
      },
    ];
  });
}

const words = [...a1Notes(), ...a2Notes(), ...(await b1Notes())];
const db = connect();
const before = await db.$count(notes);
await db
  .insert(notes)
  .values(words)
  .onConflictDoUpdate({
    target: notes.id,
    set: {
      ord: sql`excluded.ord`,
      de: sql`excluded.de`,
      en: sql`excluded.en`,
      exampleDe: sql`excluded.example_de`,
      exampleEn: sql`excluded.example_en`,
      hint: sql`excluded.hint`,
    },
    setWhere: sql`${notes.editedAt} is null`,
  });
// Notes no longer in the lists (dropped duplicates) go, with their cards; edited ones stay.
await db.delete(notes).where(
  and(
    notInArray(
      notes.id,
      words.map((w) => w.id),
    ),
    isNull(notes.editedAt),
  ),
);
await db
  .insert(cards)
  .values(
    words.flatMap((note) =>
      (["de_en", "en_de"] as const).map((direction) => ({
        id: `${note.id}:${direction}`,
        noteId: note.id,
        direction,
      })),
    ),
  )
  .onConflictDoNothing();
const perLevel = ["A1", "A2", "B1"].map((l) => `${l}: ${words.filter((w) => w.cefr === l).length}`);
console.log(`${perLevel.join(", ")} · ${(await db.$count(notes)) - before} new notes`);
process.exit(0);
