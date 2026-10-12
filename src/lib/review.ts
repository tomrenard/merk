import { and, asc, eq, gte, lte, type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { createEmptyCard, fsrs, type Grade, Rating, State, TypeConvert } from "ts-fsrs";
// Relative imports: the import script (plain node) uses ensureCards too.
import { db } from "../db/client.ts";
import { cards, notes, reviewLogs, settings } from "../db/schema.ts";
import { streakLength } from "./streak.ts";

// Fuzz spreads due dates a little, so words learned together don't stay bunched together.
const scheduler = fsrs({ enable_fuzz: true });

/** No new words on a day with more reviews than this: catch up first. */
const BACKLOG = 120;

/** Cards due within this window are shown now rather than making you wait (as Anki does). */
const LEARN_AHEAD = sql`now() + interval '20 minutes'`;

/** The study day starts at 4:00 Berlin time, so a late-night session counts for that day. */
export const DAY_START = sql`((date_trunc('day', (now() at time zone 'Europe/Berlin') - interval '4 hours') + interval '4 hours') at time zone 'Europe/Berlin')`;

/** The same person's de_en card of the same note, to hold back en_de until it was seen on an earlier day. */
const sibling = alias(cards, "sibling");
const siblingJoin = and(
  eq(sibling.noteId, cards.noteId),
  eq(sibling.userId, cards.userId),
  eq(sibling.direction, "de_en"),
);

/**
 * A card waits until tomorrow if the other direction of its word was reviewed today, so one
 * doesn't give the other away. Not while it is being learned (state 1) or relearned (3): those
 * short steps must happen today.
 */
const SIBLING_FREE = sql`(coalesce(${cards.fsrs}->>'state', '0') in ('1', '3') or not exists (
  select 1 from review_logs rl join cards s on s.id = rl.card_id
  where s.note_id = ${cards.noteId} and s.user_id = ${cards.userId} and s.id <> ${cards.id}
    and rl.reviewed_at >= ${DAY_START}))`;

/** New cards that may start now: a new word, or the English→German card of a word started on an earlier day and not reviewed today. */
const NEW_OFFERABLE = sql`${cards.introducedAt} is null and (${cards.direction} = 'de_en' or ${sibling.introducedAt} < ${DAY_START}) and ${SIBLING_FREE}`;

/** The study day a timestamp belongs to, as a date, with the same 4:00 Berlin rollover. */
const studyDay = (at: SQL | typeof reviewLogs.reviewedAt) =>
  sql`((${at} at time zone 'Europe/Berlin') - interval '4 hours')::date`;

/** A card's id: unique per person, word and direction. */
export const cardId = (userId: string, noteId: string, direction: string) =>
  `${userId}/${noteId}:${direction}`;

export type Settings = { newPerDay: number };
export type ReviewItem = {
  cardId: string;
  direction: "de_en" | "en_de" | "unit";
  reps: number;
  lapses: number;
  isNew: boolean;
  note: typeof notes.$inferSelect;
};

/** Someone's settings; defaults until they save their own. */
export async function getSettings(userId: string): Promise<Settings> {
  const [row] = await db().select().from(settings).where(eq(settings.userId, userId));
  return { newPerDay: row?.newPerDay ?? 7 };
}

export async function saveSettings(userId: string, values: Settings) {
  await db()
    .insert(settings)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: settings.userId, set: values });
}

/**
 * `due`: reviews waiting now. `newLeft`: new words still to start today (none while the backlog
 * is high). `followUps`: English→German cards of words started on an earlier day; they don't
 * count against the daily new words.
 */
export async function counts(userId: string) {
  const [[row], { newPerDay }] = await Promise.all([
    db()
      .select({
        due: sql<number>`count(*) filter (where ${cards.due} <= now() and ${SIBLING_FREE})::int`,
        newWords: sql<number>`count(*) filter (where ${NEW_OFFERABLE} and ${cards.direction} = 'de_en')::int`,
        followUps: sql<number>`count(*) filter (where ${NEW_OFFERABLE} and ${cards.direction} = 'en_de')::int`,
        startedToday: sql<number>`count(*) filter (where ${cards.direction} = 'de_en' and ${cards.introducedAt} >= ${DAY_START})::int`,
        // Reviews of already-learned cards done today: with `due`, the day's review load.
        reviewedToday: sql<number>`(select count(distinct card_id) from review_logs where user_id = ${userId} and state <> 0 and reviewed_at >= ${DAY_START})::int`,
      })
      .from(cards)
      .leftJoin(sibling, siblingJoin)
      .where(eq(cards.userId, userId)),
    getSettings(userId),
  ]);
  const { due = 0, newWords = 0, followUps = 0, startedToday = 0, reviewedToday = 0 } = row ?? {};
  // A heavy review day (done or waiting) gets no new words, so the backlog can shrink.
  const budget = due + reviewedToday > BACKLOG ? 0 : Math.max(newPerDay - startedToday, 0);
  return { due, newLeft: Math.min(budget, newWords), followUps };
}

const ITEM = {
  cardId: cards.id,
  direction: cards.direction,
  reps: sql<number>`coalesce((${cards.fsrs}->>'reps')::int, 0)`,
  lapses: sql<number>`coalesce((${cards.fsrs}->>'lapses')::int, 0)`,
  note: notes,
};

/** `due` is only set once a card has been reviewed, so new cards never match here. */
async function firstSeenDueBy(userId: string, by: SQL): Promise<ReviewItem | null> {
  const [row] = await db()
    .select(ITEM)
    .from(cards)
    .innerJoin(notes, eq(notes.id, cards.noteId))
    .where(and(eq(cards.userId, userId), lte(cards.due, by), SIBLING_FREE))
    .orderBy(asc(cards.due))
    .limit(1);
  return row ? { ...row, isNew: false } : null;
}

/** Follow-ups always; a new word only while today's budget lasts. */
async function firstNew(userId: string): Promise<ReviewItem | null> {
  const { newLeft, followUps } = await counts(userId);
  if (newLeft === 0 && followUps === 0) return null;
  const [row] = await db()
    .select(ITEM)
    .from(cards)
    .innerJoin(notes, eq(notes.id, cards.noteId))
    .leftJoin(sibling, siblingJoin)
    .where(
      and(
        eq(cards.userId, userId),
        newLeft > 0 ? NEW_OFFERABLE : and(NEW_OFFERABLE, eq(cards.direction, "en_de")),
      ),
    )
    .orderBy(asc(notes.ord), asc(cards.direction))
    .limit(1);
  return row ? { ...row, isNew: true } : null;
}

/** Due cards, then new ones, then learning cards a little early so the session can finish. */
export async function nextCard(userId: string): Promise<ReviewItem | null> {
  return (
    (await firstSeenDueBy(userId, sql`now()`)) ??
    (await firstNew(userId)) ??
    (await firstSeenDueBy(userId, LEARN_AHEAD))
  );
}

/**
 * Applies one grade to one of `userId`'s cards. `seenReps` is the review count the client was
 * shown: a repeated submit (double tap, second tab) no longer matches and is dropped instead of
 * scheduling twice.
 */
export async function grade(
  userId: string,
  id: string,
  rating: Grade,
  durationMs: number,
  seenReps: number,
) {
  await db().transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(cards)
      .where(and(eq(cards.id, id), eq(cards.userId, userId)))
      .for("update");
    if (!row) throw new Error(`Unknown card ${id}`);
    const before = row.fsrs ? TypeConvert.card(row.fsrs) : createEmptyCard();
    if (before.reps !== seenReps) return;
    const now = new Date();
    const { card } = scheduler.next(before, now, rating);
    await tx
      .update(cards)
      .set({ fsrs: card, due: card.due, introducedAt: row.introducedAt ?? now })
      .where(eq(cards.id, id));
    await tx.insert(reviewLogs).values({
      cardId: id,
      userId,
      rating,
      state: before.state,
      durationMs: Math.min(Math.max(Math.round(durationMs), 0), 10 * 60_000),
      reviewedAt: now,
    });
  });
}

/** Reviews done today, and how many study days in a row (today or yesterday counts as current). */
export async function activity(userId: string) {
  const days = await db()
    .select({
      day: sql<string>`${studyDay(reviewLogs.reviewedAt)}::text`,
      reviews: sql<number>`count(*)::int`,
      today: sql<string>`${studyDay(sql`now()`)}::text`,
    })
    .from(reviewLogs)
    .where(eq(reviewLogs.userId, userId))
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
export async function progress(userId: string) {
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
          eq(reviewLogs.userId, userId),
          eq(reviewLogs.state, State.Review),
          gte(reviewLogs.reviewedAt, sql`now() - interval '30 days'`),
        ),
      ),
    db().$count(cards, and(eq(cards.userId, userId), eq(cards.direction, "de_en"), KNOWN)),
  ]);
  return { remembered: row?.remembered ?? null, known };
}

export type PracticeScope = "today" | "all";

/** Up to 20 random words to practise: ones studied today, or any seen so far. */
export async function practiceWords(userId: string, scope: PracticeScope) {
  const studied =
    scope === "today"
      ? sql`exists (select 1 from ${reviewLogs} join ${cards} on ${cards.id} = ${reviewLogs.cardId} where ${cards.noteId} = ${notes.id} and ${cards.userId} = ${userId} and ${reviewLogs.reviewedAt} >= ${DAY_START})`
      : sql`exists (select 1 from ${cards} where ${cards.noteId} = ${notes.id} and ${cards.userId} = ${userId} and ${cards.introducedAt} is not null)`;
  // Typed practice is checked strictly, so it skips phrases (many right ways to say them).
  return db()
    .select()
    .from(notes)
    .where(and(studied, sql`${notes.source} not in ('phrase', 'unit')`))
    .orderBy(sql`random()`)
    .limit(20);
}

/**
 * After a grammar unit is first done, it gets one review card: each review shows one of its
 * exercises, so the rule (not one sentence) is spaced. Starts as if answered Good today.
 * Safe to call again: nothing changes the second time.
 */
export async function startUnitCard(
  userId: string,
  unit: { id: string; cefr: string; title: string; canDo: string },
) {
  const noteId = `unit:${unit.id}`;
  const now = new Date();
  // No 10-minute learning step: you just did the unit, so its first review is days away.
  const { card } = fsrs({ enable_fuzz: true, enable_short_term: false }).next(
    createEmptyCard(now),
    now,
    Rating.Good,
  );
  await db().transaction(async (tx) => {
    await tx
      .insert(notes)
      .values({
        id: noteId,
        source: "unit",
        cefr: unit.cefr,
        ord: 0,
        de: unit.title,
        en: unit.canDo,
      })
      .onConflictDoNothing();
    await tx
      .insert(cards)
      .values({
        id: cardId(userId, noteId, "unit"),
        noteId,
        userId,
        direction: "unit",
        fsrs: card,
        due: card.due,
        introducedAt: now,
      })
      .onConflictDoNothing();
  });
}

/**
 * Gives `userId` a card for every shared word and phrase (and their own words) they don't have
 * yet: both directions, except B1 words, which are for recognition only. Run on sign-up and
 * after each import.
 */
export async function ensureCards(userId: string) {
  await db().execute(sql`
    insert into cards (id, note_id, direction, user_id)
    select ${userId} || '/' || n.id || ':' || d.direction, n.id, d.direction, ${userId}
    from notes n cross join (values ('de_en'), ('en_de')) as d(direction)
    where (n.user_id is null or n.user_id = ${userId}) and n.source <> 'unit'
      and (d.direction = 'de_en' or n.cefr <> 'B1' or n.source = 'phrase')
    on conflict do nothing`);
}

/** Cards, logs and own words made before accounts existed become `userId`'s. */
export async function claimUnowned(userId: string) {
  await db().transaction(async (tx) => {
    await tx.update(cards).set({ userId }).where(sql`${cards.userId} is null`);
    await tx.update(reviewLogs).set({ userId }).where(sql`${reviewLogs.userId} is null`);
    await tx.execute(sql`update activity_logs set user_id = ${userId} where user_id is null`);
    await tx
      .update(notes)
      .set({ userId })
      .where(sql`${notes.source} = 'mine' and ${notes.userId} is null`);
  });
}
