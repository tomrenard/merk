import { and, asc, eq, isNotNull, isNull, lte, type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { type Card, createEmptyCard, fsrs, type Grade } from "ts-fsrs";
import { db } from "@/db/client";
import { cards, notes, reviewLogs, type StoredFsrs, settings } from "@/db/schema";

const scheduler = fsrs();

/** Cards due within this window are shown now rather than making you wait (as Anki does). */
const LEARN_AHEAD = sql`now() + interval '20 minutes'`;

/** The study day starts at 4:00 Berlin time, so a late-night session counts for that day. */
const DAY_START = sql`((date_trunc('day', (now() at time zone 'Europe/Berlin') - interval '4 hours') + interval '4 hours') at time zone 'Europe/Berlin')`;

export type Settings = typeof settings.$inferSelect;
export type ReviewItem = {
  cardId: string;
  direction: "de_en" | "en_de";
  isNew: boolean;
  note: typeof notes.$inferSelect;
};

export async function getSettings(): Promise<Settings> {
  const [row] = await db().insert(settings).values({}).onConflictDoNothing().returning();
  if (row) return row;
  const [existing] = await db().select().from(settings);
  if (!existing) throw new Error("settings row missing");
  return existing;
}

async function newIntroducedToday(): Promise<number> {
  const [row] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(cards)
    .where(sql`${cards.introducedAt} >= ${DAY_START}`);
  return row?.n ?? 0;
}

export async function counts() {
  const [due] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(cards)
    .where(and(isNotNull(cards.introducedAt), lte(cards.due, sql`now()`)));
  const { newPerDay } = await getSettings();
  const [unseen] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(cards)
    .where(isNull(cards.introducedAt));
  return {
    due: due?.n ?? 0,
    newLeft: Math.min(Math.max(newPerDay - (await newIntroducedToday()), 0), unseen?.n ?? 0),
  };
}

const ITEM = { cardId: cards.id, direction: cards.direction, note: notes };

async function firstSeenDueBy(by: SQL): Promise<ReviewItem | null> {
  const [row] = await db()
    .select(ITEM)
    .from(cards)
    .innerJoin(notes, eq(notes.id, cards.noteId))
    .where(and(isNotNull(cards.introducedAt), lte(cards.due, by)))
    .orderBy(asc(cards.due))
    .limit(1);
  return row ? { ...row, isNew: false } : null;
}

async function firstNew(): Promise<ReviewItem | null> {
  const { newPerDay } = await getSettings();
  if ((await newIntroducedToday()) >= newPerDay) return null;
  // Asking for the German only once you have seen it on an earlier day (Anki's sibling burying).
  const sibling = alias(cards, "sibling");
  const [row] = await db()
    .select(ITEM)
    .from(cards)
    .innerJoin(notes, eq(notes.id, cards.noteId))
    .leftJoin(sibling, and(eq(sibling.noteId, cards.noteId), eq(sibling.direction, "de_en")))
    .where(
      and(
        isNull(cards.introducedAt),
        sql`(${cards.direction} = 'de_en' or ${sibling.introducedAt} < ${DAY_START})`,
      ),
    )
    .orderBy(asc(notes.ord), asc(cards.direction))
    .limit(1);
  return row ? { ...row, isNew: true } : null;
}

/** Due cards, then new ones, then learning cards a little early so the session can finish. */
export async function nextCard(): Promise<ReviewItem | null> {
  return (
    (await firstSeenDueBy(sql`now()`)) ?? (await firstNew()) ?? (await firstSeenDueBy(LEARN_AHEAD))
  );
}

function toCard(stored: StoredFsrs | null): Card {
  if (!stored) return createEmptyCard();
  const { due, last_review, ...rest } = stored;
  return {
    ...rest,
    due: new Date(due),
    ...(last_review && { last_review: new Date(last_review) }),
  };
}

function toStored(card: Card): StoredFsrs {
  const { due, last_review, ...rest } = card;
  return {
    ...rest,
    due: due.toISOString(),
    ...(last_review && { last_review: last_review.toISOString() }),
  };
}

export async function grade(cardId: string, rating: Grade, durationMs: number): Promise<void> {
  await db().transaction(async (tx) => {
    const [row] = await tx.select().from(cards).where(eq(cards.id, cardId)).for("update");
    if (!row) throw new Error(`Unknown card ${cardId}`);
    const now = new Date();
    const before = toCard(row.fsrs);
    const { card } = scheduler.next(before, now, rating);
    await tx
      .update(cards)
      .set({ fsrs: toStored(card), due: card.due, introducedAt: row.introducedAt ?? now })
      .where(eq(cards.id, cardId));
    await tx.insert(reviewLogs).values({
      cardId,
      rating,
      state: before.state,
      durationMs: Math.min(Math.max(Math.round(durationMs), 0), 10 * 60_000),
      reviewedAt: now,
    });
  });
}
