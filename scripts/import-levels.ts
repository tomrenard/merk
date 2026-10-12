/**
 * Adds A2 and B1 on top of A1, skipping words already in the deck.
 *
 * - A2: the Goethe A2 word list as an Anki deck (github.com/langfield/A2_Wortliste_Goethe), with
 *   English, article, plural, verb forms and an example.
 * - B1: the Goethe-Zertifikat B1 Wortliste in frequency order (github.com/kennethsible/goethe-wortliste),
 *   German only. English and an example are generated once with Claude and cached.
 *
 * Neither source states a licence, so both are fetched into data/.cache (git-ignored), never
 * committed. Safe to re-run: notes upsert by id, cards are only ever added.
 *
 * Needs DATABASE_URL and, for the B1 translations, AI_GATEWAY_API_KEY or a fresh
 * VERCEL_OIDC_TOKEN (`vercel env pull`), since Claude is reached through Vercel AI Gateway.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { connect } from "../src/db/client.ts";
import { cards, notes } from "../src/db/schema.ts";
import { lemmaKey } from "../src/lib/german.ts";

type Note = typeof notes.$inferInsert;

const CACHE = new URL("../data/.cache/", import.meta.url).pathname;
mkdirSync(CACHE, { recursive: true });

function fetchRepo(name: string, url: string): string {
  const dir = `${CACHE}${name}`;
  if (!existsSync(dir)) execFileSync("git", ["clone", "--quiet", "--depth", "1", url, dir]);
  return dir;
}

const db = connect();
const seen = new Set((await db.select({ de: notes.de }).from(notes)).map((n) => lemmaKey(n.de)));

/** Keeps the first note per word: earlier levels win. */
function isNewWord(de: string): boolean {
  const key = lemmaKey(de);
  if (!key || seen.has(key)) return false;
  seen.add(key);
  return true;
}

function a2Notes(): Note[] {
  const dir = `${fetchRepo("a2", "https://github.com/langfield/A2_Wortliste_Goethe.git")}/A2_Wortliste_Goethe`;
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const text = readFileSync(`${dir}/${file}`, "utf8");
      const field = (name: string) =>
        text.match(new RegExp(`### ${name}\\n([^#]*)`))?.[1]?.trim() || null;
      const plural = field("Plural");
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
    z.object({
      de: z.string(),
      en: z.string(),
      example_de: z.string(),
      example_en: z.string(),
    }),
  ),
});
type Translated = z.infer<typeof Translation>["items"][number];

/** English and one example per headword, from Claude, cached so a re-run costs nothing. */
async function translate(headwords: string[]): Promise<Map<string, Translated>> {
  const cacheFile = `${CACHE}b1-translations.json`;
  const cached: Record<string, Translated> = existsSync(cacheFile)
    ? JSON.parse(readFileSync(cacheFile, "utf8"))
    : {};
  const missing = headwords.filter((de) => !cached[de]);
  if (missing.length) {
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
  }
  return new Map(headwords.flatMap((de) => (cached[de] ? [[de, cached[de]] as const] : [])));
}

async function b1Notes(): Promise<Note[]> {
  const dir = fetchRepo("b1", "https://github.com/kennethsible/goethe-wortliste.git");
  const lines = readFileSync(`${dir}/sorted.txt`, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.endsWith("-"));
  // Verbs come with their forms ("retten, rettet, rettete, hat gerettet"): word first, forms as hint.
  const entries = lines.map((line, rank) => {
    const isNoun = /^(der|die|das) /.test(line);
    const [word = line, ...forms] = isNoun ? [line] : line.split(", ");
    return { de: word, hint: forms.join(", ") || null, rank };
  });
  const fresh = entries.filter((entry) => isNewWord(entry.de));
  const translations = await translate(fresh.map((entry) => entry.de));
  return fresh.flatMap(({ de, hint, rank }) => {
    const t = translations.get(de);
    if (!t) return [];
    return [
      {
        id: `goethe-b1:${lemmaKey(de)}`,
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

async function save(level: Note[]) {
  for (let i = 0; i < level.length; i += 500) {
    const chunk = level.slice(i, i + 500);
    await db
      .insert(notes)
      .values(chunk)
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
      });
    await db
      .insert(cards)
      .values(
        chunk.flatMap((note) =>
          (["de_en", "en_de"] as const).map((direction) => ({
            id: `${note.id}:${direction}`,
            noteId: note.id,
            direction,
          })),
        ),
      )
      .onConflictDoNothing();
  }
}

const a2 = a2Notes();
await save(a2);
const b1 = await b1Notes();
await save(b1);
console.log(`A2: ${a2.length} new words, B1: ${b1.length} new words`);
process.exit(0);
