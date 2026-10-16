/**
 * Loads data/darija/words.json into the Darija course, in file order (teaching order): one note
 * per entry ("ary:<id>", source ary-word or ary-phrase), then cards for everyone. Safe to re-run:
 * notes update in place unless edited by hand; nothing is ever deleted.
 */
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { connect } from "../src/db/client.ts";
import { notes, user } from "../src/db/schema.ts";
import { DarijaWord, wordProblems } from "../src/lib/darija-words.ts";
import { ensureCards } from "../src/lib/review.ts";

const words = DarijaWord.array().parse(
  JSON.parse(readFileSync(new URL("../data/darija/words.json", import.meta.url), "utf8")),
);
const problems = wordProblems(words);
if (problems.length) throw new Error(problems.join("\n"));

const db = connect();
await db
  .insert(notes)
  .values(
    words.map((w, ord) => ({
      id: `ary:${w.id}`,
      course: "ary",
      source: w.phrase ? "ary-phrase" : "ary-word",
      cefr: "A1",
      ord,
      de: w.de,
      tr: w.tr,
      en: w.en,
      exampleDe: w.exampleDe ?? null,
      exampleTr: w.exampleTr ?? null,
      exampleEn: w.exampleEn ?? null,
    })),
  )
  .onConflictDoUpdate({
    target: notes.id,
    set: {
      ord: sql`excluded.ord`,
      de: sql`excluded.de`,
      tr: sql`excluded.tr`,
      en: sql`excluded.en`,
      exampleDe: sql`excluded.example_de`,
      exampleTr: sql`excluded.example_tr`,
      exampleEn: sql`excluded.example_en`,
    },
    setWhere: sql`${notes.editedAt} is null`,
  });
for (const { id } of await db.select({ id: user.id }).from(user)) await ensureCards(id);
console.log(`${words.length} Darija words and phrases`);
process.exit(0);
