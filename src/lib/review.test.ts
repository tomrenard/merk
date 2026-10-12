import { eq, sql } from "drizzle-orm";
import { createEmptyCard, State } from "ts-fsrs";
import { beforeEach, describe, expect, it } from "vitest";
import { cards, reviewLogs, settings } from "@/db/schema";
import { seedWords, testDb } from "@/test/db";
import { counts, grade, nextCard } from "./review";

const DAY = 86_400_000;
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
    expect((await nextCard())?.cardId).toBe("eins:de_en");
    expect(await counts()).toEqual({ due: 0, newLeft: 3, followUps: 0 });
  });

  it("holds back English→German until the day after", async () => {
    await grade("eins:de_en", 3, 1000, 0);
    expect((await nextCard())?.cardId).toBe("zwei:de_en");
  });

  it("counts words, and still offers follow-ups once the day's words are used up", async () => {
    await db.update(settings).set({ newPerDay: 1 });
    await started("eins:de_en", State.Review);
    await db
      .update(cards)
      .set({ due: new Date(Date.now() + DAY) })
      .where(eq(cards.id, "eins:de_en"));
    await grade("zwei:de_en", 3, 1000, 0);
    expect(await counts()).toMatchObject({ newLeft: 0, followUps: 1 });
    expect((await nextCard())?.cardId).toBe("eins:en_de");
  });

  it("pauses new words on a heavy review day, done or still waiting", async () => {
    await seedWords(
      db,
      Array.from({ length: 121 }, (_, i) => `w${i}`),
    );
    await db.execute(
      sql`insert into review_logs (card_id, rating, state) select id, 3, 2 from cards where id like 'w%:de_en' and id < 'w6'`,
    );
    await db.execute(
      sql`update cards set due = now() - interval '1 hour', introduced_at = now() - interval '3 days' where id like 'w%:de_en' and id >= 'w6'`,
    );
    const { due, newLeft } = await counts();
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
    const first = await nextCard();
    await grade(first?.cardId ?? "", 3, 1000, first?.reps ?? 0);
    expect((await nextCard())?.cardId).not.toMatch(/^eins:/);
    expect((await counts()).due).toBe(0);
  });

  it("keeps a new English→German card for tomorrow if its German→English card was reviewed today", async () => {
    await db
      .update(cards)
      .set({ fsrs: null, due: null, introducedAt: null })
      .where(eq(cards.id, "eins:en_de"));
    await db.insert(reviewLogs).values({ cardId: "eins:de_en", rating: 3, state: 2 });
    await db
      .update(cards)
      .set({ due: new Date(Date.now() + DAY) })
      .where(eq(cards.id, "eins:de_en"));
    expect((await counts()).followUps).toBe(0);
  });

  it("still shows a card that is being relearned", async () => {
    await started("eins:en_de", State.Relearning);
    await db.insert(reviewLogs).values({ cardId: "eins:de_en", rating: 3, state: 2 });
    await db
      .update(cards)
      .set({ due: new Date(Date.now() + DAY) })
      .where(eq(cards.id, "eins:de_en"));
    expect((await nextCard())?.cardId).toBe("eins:en_de");
  });
});
