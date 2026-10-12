/**
 * Loads data/goethe-a1.tsv (the Codeberg source of the "Goethe Institute A1 Wordlist" Anki deck)
 * into notes, and creates both card directions. Safe to re-run: notes update in place, cards and
 * their review history are left alone.
 *
 * Columns: anki id, German, example DE, English, example EN, hint, (unused), audio.
 */
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { connect } from "../src/db/client.ts";
import { cards, notes } from "../src/db/schema.ts";

const db = connect();
const rows = readFileSync(new URL("../data/goethe-a1.tsv", import.meta.url), "utf8")
  .split("\n")
  .filter((line) => line.trim())
  .map((line) => line.split("\t"));

const orNull = (value: string | undefined) => value?.trim() || null;
const parsed = rows.map(([id, de, exampleDe, en, exampleEn, hint], ord) => {
  if (!id || !de || !en) throw new Error(`Bad row ${ord + 1}: ${rows[ord]?.join(" | ")}`);
  return {
    id: `goethe-a1:${id}`,
    source: "goethe-a1",
    cefr: "A1",
    ord,
    de: de.trim(),
    exampleDe: orNull(exampleDe),
    en: en.trim(),
    exampleEn: orNull(exampleEn),
    hint: orNull(hint),
  };
});

const before = await db.$count(notes);
for (let i = 0; i < parsed.length; i += 200) {
  const chunk = parsed.slice(i, i + 200);
  await db
    .insert(notes)
    .values(chunk)
    .onConflictDoUpdate({
      target: notes.id,
      set: {
        ord: sql`excluded.ord`,
        de: sql`excluded.de`,
        exampleDe: sql`excluded.example_de`,
        en: sql`excluded.en`,
        exampleEn: sql`excluded.example_en`,
        hint: sql`excluded.hint`,
        updatedAt: sql`now()`,
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
const after = await db.$count(notes);
console.log(`${parsed.length} rows, ${after - before} new notes, ${after} total`);
process.exit(0);
