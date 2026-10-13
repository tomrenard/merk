import { and, asc, count, eq, ilike, isNull, ne, or, type SQL, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { cards, notes } from "@/db/schema";
import { KNOWN, TRICKY } from "@/lib/review";

/** Words per page; the list loads the next page as you scroll to its end. */
export const PAGE = 100;

/** Word filters: by where you are with a word, by level, or by kind. */
export const FILTERS: { key: string; label: string; where: SQL }[] = [
  { key: "new", label: "New", where: sql`${cards.introducedAt} is null` },
  {
    key: "learning",
    label: "Learning",
    where: sql`${cards.introducedAt} is not null and not ${KNOWN}`,
  },
  { key: "known", label: "⭐ Known", where: KNOWN },
  { key: "tricky", label: "🧠 Tricky", where: TRICKY },
  { key: "A1", label: "A1", where: sql`${notes.cefr} = 'A1'` },
  { key: "A2", label: "A2", where: sql`${notes.cefr} = 'A2'` },
  { key: "B1", label: "B1", where: sql`${notes.cefr} = 'B1'` },
  { key: "B2", label: "B2", where: sql`${notes.cefr} = 'B2'` },
  { key: "phrases", label: "Phrases", where: sql`${notes.source} = 'phrase'` },
  { key: "mine", label: "Mine", where: sql`${notes.source} = 'mine'` },
];

export type WordRow = { id: string; de: string; en: string; cefr: string; due: Date | null };

/** `userId`'s de_en card for each note, so filters can look at where you are with a word. */
const yourCard = (userId: string) =>
  and(eq(cards.noteId, notes.id), eq(cards.userId, userId), eq(cards.direction, "de_en"));

/** Shared words plus your own (not someone else's), searched and filtered. */
function wordsWhere(userId: string, q: string, filterKey: string) {
  // Matched literally: % and _ would otherwise be ILIKE wildcards.
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  return and(
    q ? or(ilike(notes.de, pattern), ilike(notes.en, pattern)) : undefined,
    FILTERS.find((f) => f.key === filterKey)?.where,
    ne(notes.source, "unit"),
    or(eq(notes.userId, userId), and(isNull(notes.userId), ne(notes.source, "mine"))),
  );
}

/** One page of the word list, from `offset`, in teaching order. */
export async function findWords(
  userId: string,
  q: string,
  filterKey: string,
  offset: number,
): Promise<WordRow[]> {
  return db()
    .select({ id: notes.id, de: notes.de, en: notes.en, cefr: notes.cefr, due: cards.due })
    .from(notes)
    .leftJoin(cards, yourCard(userId))
    .where(wordsWhere(userId, q, filterKey))
    .orderBy(asc(notes.ord), asc(notes.id))
    .limit(PAGE)
    .offset(offset);
}

export async function countWords(userId: string, q: string, filterKey: string) {
  const [row] = await db()
    .select({ n: count() })
    .from(notes)
    .leftJoin(cards, yourCard(userId))
    .where(wordsWhere(userId, q, filterKey));
  return row?.n ?? 0;
}
