import { eq, sql } from "drizzle-orm";
import { createEmptyCard, State } from "ts-fsrs";
import { beforeEach, describe, expect, it } from "vitest";
import { cards, notes, reviewLogs, settings } from "@/db/schema";
import { seedWords, testDb } from "@/test/db";
import { counts, grade, nextCard } from "./review";

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
    expect(await counts(U)).toEqual({ due: 0, newLeft: 3, followUps: 0 });
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
