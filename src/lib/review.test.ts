import { eq, sql } from "drizzle-orm";
import { createEmptyCard, State } from "ts-fsrs";
import { beforeEach, describe, expect, it } from "vitest";
import { cards, notes, reviewLogs, settings } from "@/db/schema";
import { seedWords, testDb } from "@/test/db";
import { counts, grade, nextCard, reviewBatch } from "./review";

const DAY = 86_400_000;
const U = "u1";
let db: Awaited<ReturnType<typeof testDb>>;

/** Puts a card in a given FSRS state, started `daysAgo` days ago and due an hour ago. */
async function started(id: string, state: State, daysAgo = 3) {
  const past = new Date(Date.now() - daysAgo * DAY);
  const due = new Date(Date.now() - 3_600_000);
  const fsrs = {
    ...createEmptyCard(past),
    state,
    stability: 5,
    difficulty: 5,
    reps: 3,
    last_review: past,
    due,
  };
  await db.update(cards).set({ fsrs, due, introducedAt: past }).where(eq(cards.id, id));
}

beforeEach(async () => {
  db = await testDb();
  await seedWords(db, ["eins", "zwei", "drei"]);
});

describe("new words", () => {
  it("offers new words in order, German→English first", async () => {
    expect((await nextCard(U))?.cardId).toBe("eins:de_en");
    expect(await counts(U)).toMatchObject({ due: 0, newLeft: 3, followUps: 0, paused: false });
  });

  it("holds back English→German until the day after", async () => {
    await grade(U, "eins:de_en", 3, 1000, 0);
    expect((await nextCard(U))?.cardId).toBe("zwei:de_en");
  });

  it("counts words, and still offers follow-ups once the day's words are used up", async () => {
    await db.insert(settings).values({ userId: U, newPerDay: 1 });
    await started("eins:de_en", State.Review);
    await db
      .update(cards)
      .set({ due: new Date(Date.now() + DAY) })
      .where(eq(cards.id, "eins:de_en"));
    await grade(U, "zwei:de_en", 3, 1000, 0);
    expect(await counts(U)).toMatchObject({ newLeft: 0, followUps: 1 });
    expect((await nextCard(U))?.cardId).toBe("eins:en_de");
  });

  it("pauses new words on a heavy review day, done or still waiting", async () => {
    await seedWords(
      db,
      Array.from({ length: 121 }, (_, i) => `w${i}`),
    );
    await db.execute(
      sql`insert into review_logs (card_id, user_id, rating, state) select id, 'u1', 3, 2 from cards where id like 'w%:de_en' and id < 'w6'`,
    );
    await db.execute(
      sql`update cards set due = now() - interval '1 hour', introduced_at = now() - interval '3 days' where id like 'w%:de_en' and id >= 'w6'`,
    );
    const { due, newLeft } = await counts(U);
    expect(due).toBeLessThan(121);
    expect(newLeft).toBe(0);
  });
});

describe("extra new words and known words", () => {
  it("+5 new words today raises today's budget", async () => {
    await db.insert(settings).values({ userId: U, newPerDay: 1 });
    await grade(U, "eins:de_en", 3, 1000, 0);
    expect((await counts(U)).newLeft).toBe(0);
    await db.execute(
      sql`insert into activity_logs (user_id, kind, ref, score) values ('u1', 'extra_new', 'today', 5)`,
    );
    expect((await counts(U)).newLeft).toBe(2);
  });

  it("I know this: the word's cards become learned, due weeks later", async () => {
    const { markKnown } = await import("./review");
    await markKnown(U, ["eins"]);
    const mine = await db.select().from(cards).where(eq(cards.noteId, "eins"));
    for (const card of mine) {
      expect(card.fsrs?.state).toBe(State.Review);
      expect(card.due?.getTime()).toBeGreaterThan(Date.now() + 2 * DAY);
    }
    expect((await nextCard(U))?.cardId).toBe("zwei:de_en");
  });

  it("marking words known doesn't use up today's new words", async () => {
    const { markKnown } = await import("./review");
    await db.insert(settings).values({ userId: U, newPerDay: 1 });
    await markKnown(U, ["eins", "zwei"]);
    expect((await counts(U)).newLeft).toBe(1);
  });
});

describe("siblings", () => {
  beforeEach(async () => {
    await started("eins:de_en", State.Review);
    await started("eins:en_de", State.Review);
  });

  it("keeps the other direction for tomorrow once one was reviewed today", async () => {
    const first = await nextCard(U);
    await grade(U, first?.cardId ?? "", 3, 1000, first?.reps ?? 0);
    expect((await nextCard(U))?.cardId).not.toMatch(/^eins:/);
    expect((await counts(U)).due).toBe(0);
  });

  it("keeps a new English→German card for tomorrow if its German→English card was reviewed today", async () => {
    await db
      .update(cards)
      .set({ fsrs: null, due: null, introducedAt: null })
      .where(eq(cards.id, "eins:en_de"));
    await db.insert(reviewLogs).values({ cardId: "eins:de_en", userId: U, rating: 3, state: 2 });
    await db
      .update(cards)
      .set({ due: new Date(Date.now() + DAY) })
      .where(eq(cards.id, "eins:de_en"));
    expect((await counts(U)).followUps).toBe(0);
  });

  it("still shows a card that is being relearned", async () => {
    await started("eins:en_de", State.Relearning);
    await db.insert(reviewLogs).values({ cardId: "eins:de_en", userId: U, rating: 3, state: 2 });
    await db
      .update(cards)
      .set({ due: new Date(Date.now() + DAY) })
      .where(eq(cards.id, "eins:de_en"));
    expect((await nextCard(U))?.cardId).toBe("eins:en_de");
  });
});

describe("unit review cards", () => {
  it("starts a unit card due later, never offered as a new word", async () => {
    const { startUnitCard } = await import("./review");
    await startUnitCard(U, { id: "a1-01", cefr: "A1", title: "sein", canDo: "Say who you are" });
    await startUnitCard(U, { id: "a1-01", cefr: "A1", title: "sein", canDo: "Say who you are" });
    const [card] = await db.select().from(cards).where(eq(cards.id, "u1/unit:a1-01:unit"));
    expect(card?.due?.getTime()).toBeGreaterThan(Date.now() + DAY);
    expect(card?.fsrs?.state).toBe(State.Review);
    expect(card?.introducedAt).not.toBeNull();
    expect((await counts(U)).newLeft).toBe(3);
  });

  it("shows one of the unit's exercises when due", async () => {
    const { startUnitCard } = await import("./review");
    const { withExercise } = await import("./course");
    await startUnitCard(U, { id: "a1-01", cefr: "A1", title: "sein", canDo: "Say who you are" });
    await db
      .update(cards)
      .set({ due: new Date(Date.now() - 1000) })
      .where(eq(cards.id, "u1/unit:a1-01:unit"));
    const item = withExercise(await nextCard(U));
    expect(item?.direction).toBe("unit");
    expect(item?.exercise?.id).toMatch(/^a1-01-/);
  });
});

describe("two people", () => {
  it("never see or grade each other's cards", async () => {
    const { ensureCards } = await import("./review");
    await ensureCards("u2");
    expect((await counts("u2")).newLeft).toBe(3);
    const mine = await nextCard(U);
    const hers = await nextCard("u2");
    expect(mine?.cardId).toBe("eins:de_en");
    expect(hers?.cardId).toBe("u2/eins:de_en");
    await grade(U, "eins:de_en", 3, 1000, 0);
    expect((await nextCard("u2"))?.cardId).toBe("u2/eins:de_en");
    await expect(grade("u2", "eins:de_en", 3, 1000, 1)).rejects.toThrow("Unknown card");
  });

  it("doesn't give one person's own words to someone else", async () => {
    const { ensureCards } = await import("./review");
    await db.insert(notes).values({
      id: "mine:x",
      source: "mine",
      cefr: "Mine",
      ord: -1,
      de: "der Kiez",
      en: "neighbourhood",
    });
    await ensureCards("u2");
    const hers = await db.select().from(cards).where(eq(cards.userId, "u2"));
    expect(hers.some((card) => card.noteId === "mine:x")).toBe(false);
  });

  it("claims cards made before accounts for the owner", async () => {
    const { claimUnowned } = await import("./review");
    const { ensureCards } = await import("./review");
    await db.update(cards).set({ userId: null });
    await ensureCards("u2"); // the fresh deck sign-up gives
    await claimUnowned("u2");
    expect((await nextCard("u2"))?.cardId).toBe("eins:de_en");
    expect(await nextCard(U)).toBeNull();
  });
});

describe("a session ends", () => {
  it("shows each new word once, a missed one once more, then is done", async () => {
    // beforeEach seeds three words; all new today.
    expect(await counts(U)).toMatchObject({ due: 0, newLeft: 3, repeats: 0 });
    const seen: string[] = [];
    for (let card = await nextCard(U); card; card = await nextCard(U)) {
      // The first word is missed the first time.
      const missed = seen.length === 0;
      seen.push(card.cardId);
      await grade(U, card.cardId, missed ? 1 : 3, 1000, card.reps);
      if (seen.length > 20) throw new Error("session never ends");
    }
    expect(seen).toHaveLength(4);
    expect(seen.filter((id) => id === seen[0])).toHaveLength(2);
    expect(await counts(U)).toMatchObject({ due: 0, newLeft: 0, repeats: 0 });
  });

  it("counts a missed word as a repeat about 10 minutes away", async () => {
    const card = await nextCard(U);
    if (!card) throw new Error("no card");
    await grade(U, card.cardId, 1, 1000, card.reps);
    const [row] = await db.select({ due: cards.due }).from(cards).where(eq(cards.id, card.cardId));
    const minutes = ((row?.due?.getTime() ?? 0) - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(8);
    expect(minutes).toBeLessThan(12);
    expect((await counts(U)).repeats).toBe(1);
  });
});

describe("repeats", () => {
  it("leaves out a card held back because its other direction was reviewed today", async () => {
    // eins:de_en reviewed today; eins:en_de (a review card) due in 5 minutes is held until tomorrow.
    await started("eins:de_en", State.Review);
    await grade(U, "eins:de_en", 3, 1000, 3);
    await started("eins:en_de", State.Review);
    await db
      .update(cards)
      .set({ due: new Date(Date.now() + 5 * 60_000) })
      .where(eq(cards.id, "eins:en_de"));
    expect((await counts(U)).repeats).toBe(0);
  });
});

describe("offline", () => {
  it("sends a batch in nextCard's order, one card per word, new words within today's budget", async () => {
    await db.insert(settings).values({ userId: U, newPerDay: 2 });
    await started("drei:en_de", State.Review);
    await started("drei:de_en", State.Review);
    const batch = await reviewBatch(U);
    expect(batch.map((card) => card.note.id)).toEqual(["drei", "eins", "zwei"]);
    expect(batch.slice(1).every((card) => card.isNew && card.direction === "de_en")).toBe(true);
  });

  it("schedules an answer from when it was given, never later than now", async () => {
    const hourAgo = new Date(Date.now() - 3_600_000);
    await grade(U, "eins:de_en", 3, 1000, 0, hourAgo);
    await grade(U, "zwei:de_en", 3, 1000, 0, new Date(Date.now() + 86_400_000));
    const logs = await db.select().from(reviewLogs).orderBy(reviewLogs.cardId);
    expect(logs[0]?.reviewedAt.getTime()).toBe(hourAgo.getTime());
    expect(logs[1]?.reviewedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("drops an answer sent twice", async () => {
    await grade(U, "eins:de_en", 1, 1000, 0);
    await grade(U, "eins:de_en", 1, 1000, 0);
    expect(await db.$count(reviewLogs)).toBe(1);
  });
});
