import { beforeEach, describe, expect, it } from "vitest";
import { seedWords, testDb } from "@/test/db";
import { counts, grade, nextCard } from "./review";

describe("review queue (real SQL on PGlite)", () => {
  beforeEach(async () => {
    await seedWords(await testDb(), ["eins", "zwei", "drei"]);
  });

  it("offers new words in order, German→English first", async () => {
    expect((await nextCard())?.cardId).toBe("eins:de_en");
    expect(await counts()).toEqual({ due: 0, newLeft: 3 });
  });

  it("holds back English→German until the day after", async () => {
    await grade("eins:de_en", 3, 1000, 0);
    const next = await nextCard();
    expect(next?.cardId).not.toBe("eins:en_de");
  });
});
