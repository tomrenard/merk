import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { cards, notes } from "@/db/schema";

/** A fresh in-memory Postgres with every migration applied, installed as the app's db(). */
export async function testDb() {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
  (globalThis as { merkDb?: unknown }).merkDb = db;
  return db;
}

/** Inserts words with both cards each, in the given order. */
export async function seedWords(db: Awaited<ReturnType<typeof testDb>>, words: string[]) {
  await db
    .insert(notes)
    .values(
      words.map((de, ord) => ({ id: de, source: "test", cefr: "A1", ord, de, en: `en ${de}` })),
    );
  await db.insert(cards).values(
    words.flatMap((de) =>
      (["de_en", "en_de"] as const).map((direction) => ({
        id: `${de}:${direction}`,
        noteId: de,
        direction,
      })),
    ),
  );
}
