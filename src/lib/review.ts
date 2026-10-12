import { and, asc, eq, gte, lte, type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { createEmptyCard, fsrs, type Grade, State, TypeConvert } from "ts-fsrs";
import { db } from "@/db/client";
import { cards, notes, reviewLogs, settings } from "@/db/schema";
import { streakLength } from "@/lib/streak";

const scheduler = fsrs();

/** Cards due within this window are shown now rather than making you wait (as Anki does). */
const LEARN_AHEAD = sql`now() + interval '20 minutes'`;

/** The study day starts at 4:00 Berlin time, so a late-night session counts for that day. */
const DAY_START = sql`((date_trunc('day', (now() at time zone 'Europe/Berlin') - interval '4 hours') + interval '4 hours') at time zone 'Europe/Berlin')`;

/** The de_en card of the same note, to hold back en_de until it was seen on an earlier day. */
const sibling = alias(cards, "sibling");
const siblingJoin = and(eq(sibling.noteId, cards.noteId), eq(sibling.direction, "de_en"));
const NEW_OFFERABLE = sql`${cards.introducedAt} is null and (${cards.direction} = 'de_en' or ${sibling.introducedAt} < ${DAY_START})`;

/** The study day a timestamp belongs to, as a date, with the same 4:00 Berlin rollover. */
const studyDay = (at: SQL | typeof reviewLogs.reviewedAt) =>
  sql`((${at} at time zone 'Europe/Berlin') - interval '4 hours')::date`;

export type Settings = typeof settings.$inferSelect;
export type ReviewItem = {
  cardId: string;
  direction: "de_en" | "en_de";
  reps: number;
  isNew: boolean;
  note: typeof notes.$inferSelect;
};

export async function getSettings(): Promise<Settings> {
  const [row] = await db().select().from(settings);
  if (!row) throw new Error("settings row missing: run the migrations");
  return row;
}

export async function counts() {
  const [row] = await db()
    .select({
      due: sql<number>`count(*) filter (where ${cards.due} <= now())::int`,
      offerable: sql<number>`count(*) filter (where ${NEW_OFFERABLE})::int`,
      newToday: sql<number>`count(*) filter (where ${cards.introducedAt} >= ${DAY_START})::int`,
    })
    .from(cards)
    .leftJoin(sibling, siblingJoin);
  const { newPerDay } = await getSettings();
  const { due = 0, offerable = 0, newToday = 0 } = row ?? {};
  return { due, newLeft: Math.min(Math.max(newPerDay - newToday, 0), offerable) };
}

const ITEM = {
  cardId: cards.id,
  direction: cards.direction,
  reps: sql<number>`coalesce((${cards.fsrs}->>'reps')::int, 0)`,
  note: notes,
};

/** `due` is only set once a card has been reviewed, so new cards never match here. */
async function firstSeenDueBy(by: SQL): Promise<ReviewItem | null> {
  const [row] = await db()
    .select(ITEM)
    .from(cards)
    .innerJoin(notes, eq(notes.id, cards.noteId))
    .where(lte(cards.due, by))
    .orderBy(asc(cards.due))
    .limit(1);
  return row ? { ...row, isNew: false } : null;
}

async function firstNew(): Promise<ReviewItem | null> {
  if ((await counts()).newLeft === 0) return null;
  const [row] = await db()
    .select(ITEM)
    .from(cards)
    .innerJoin(notes, eq(notes.id, cards.noteId))
    .leftJoin(sibling, siblingJoin)
    .where(NEW_OFFERABLE)
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

/**
 * Applies one grade. `seenReps` is the review count the client was shown: a repeated submit
 * (double tap, second tab) no longer matches and is dropped instead of scheduling twice.
 */
export async function grade(cardId: string, rating: Grade, durationMs: number, seenReps: number) {
  await db().transaction(async (tx) => {
    const [row] = await tx.select().from(cards).where(eq(cards.id, cardId)).for("update");
    if (!row) throw new Error(`Unknown card ${cardId}`);
    const before = row.fsrs ? TypeConvert.card(row.fsrs) : createEmptyCard();
    if (before.reps !== seenReps) return;
    const now = new Date();
    const { card } = scheduler.next(before, now, rating);
    await tx
      .update(cards)
      .set({ fsrs: card, due: card.due, introducedAt: row.introducedAt ?? now })
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

/** Reviews done today, and how many study days in a row (today or yesterday counts as current). */
export async function activity() {
  const days = await db()
    .select({
      day: sql<string>`${studyDay(reviewLogs.reviewedAt)}::text`,
      reviews: sql<number>`count(*)::int`,
      today: sql<string>`${studyDay(sql`now()`)}::text`,
    })
    .from(reviewLogs)
    .groupBy(sql`1`)
    .orderBy(sql`1 desc`)
    .limit(1000);
  const [latest] = days;
  if (!latest) return { reviewsToday: 0, streak: 0 };
  return {
    reviewsToday: latest.day === latest.today ? latest.reviews : 0,
    streak: streakLength(
      days.map((d) => d.day),
      latest.today,
    ),
  };
}

/** A word counts as known once its German→English card was last scheduled a week+ out. */
export const KNOWN = sql`(${cards.fsrs}->>'scheduled_days')::int >= 7`;

/**
 * `remembered`: % of reviews of already-learned cards in the last 30 days not graded Again
 * (null before there are any). `known`: how many words are KNOWN.
 */
export async function progress() {
  const [[row], known] = await Promise.all([
    db()
      .select({
        remembered: sql<
          number | null
        >`round(100.0 * count(*) filter (where ${reviewLogs.rating} > 1) / nullif(count(*), 0))::int`,
      })
      .from(reviewLogs)
      .where(
        and(
          eq(reviewLogs.state, State.Review),
          gte(reviewLogs.reviewedAt, sql`now() - interval '30 days'`),
        ),
      ),
    db().$count(cards, and(eq(cards.direction, "de_en"), KNOWN)),
  ]);
  return { remembered: row?.remembered ?? null, known };
}

export type PracticeScope = "today" | "all";

/** Up to 20 random words to practise: ones studied today, or any seen so far. */
export async function practiceWords(scope: PracticeScope) {
  const studied =
    scope === "today"
      ? sql`exists (select 1 from ${reviewLogs} join ${cards} on ${cards.id} = ${reviewLogs.cardId} where ${cards.noteId} = ${notes.id} and ${reviewLogs.reviewedAt} >= ${DAY_START})`
      : sql`exists (select 1 from ${cards} where ${cards.noteId} = ${notes.id} and ${cards.introducedAt} is not null)`;
  return db().select().from(notes).where(studied).orderBy(sql`random()`).limit(20);
}
