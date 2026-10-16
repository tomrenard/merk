import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { activityLogs, notes } from "@/db/schema";
import { seedWords, testDb } from "@/test/db";
import { COURSE, courseProgress } from "./course";
import { COURSE_IDS, COURSES, courseOfId } from "./courses";
import {
  counts,
  ensureCards,
  nextCard,
  practiceWords,
  progress,
  wordChoices,
  wordLevels,
} from "./review";
import { countWords, findWords } from "./words";

const U = "u1";
let db: Awaited<ReturnType<typeof testDb>>;

/** What the German course shows: should never move when Darija data appears. */
const german = async () => ({
  counts: await counts(U, "de"),
  next: (await nextCard(U, "de"))?.cardId,
  progress: await progress(U, "de"),
  levels: await wordLevels(U, "de"),
  words: (await findWords(U, "de", "", "", 0)).map((w) => w.id),
  total: await countWords(U, "de", "", ""),
  course: [...(await courseProgress(U, "de")).entries()],
});

beforeEach(async () => {
  db = await testDb();
  await seedWords(db, ["eins", "zwei"]);
});

describe("courses stay apart", () => {
  it("Darija words, cards and lesson logs leave the German course unchanged", async () => {
    const before = await german();
    await db.insert(notes).values([
      {
        id: "ary:salam",
        course: "ary",
        source: "ary-word",
        cefr: "A1",
        ord: -5,
        de: "سلام",
        en: "bonjour",
      },
      {
        id: "ary:bzaf",
        course: "ary",
        source: "ary-word",
        cefr: "A1",
        ord: -4,
        de: "بزاف",
        en: "beaucoup",
      },
    ]);
    await ensureCards(U);
    await db.insert(activityLogs).values([
      { userId: U, course: "ary", kind: "unit", ref: "ary-a1-01", score: 6, total: 6 },
      { userId: U, course: "ary", kind: "extra_new", ref: "today", score: 5 },
    ]);
    expect(await german()).toEqual(before);

    // And the Darija course sees only its own.
    expect((await nextCard(U, "ary"))?.note.id).toBe("ary:salam");
    expect(await counts(U, "ary")).toMatchObject({ newLeft: 2 });
    expect((await findWords(U, "ary", "", "", 0)).map((w) => w.id)).toEqual([
      "ary:salam",
      "ary:bzaf",
    ]);
    expect(await practiceWords(U, "all", "ary")).toEqual([]);
    expect([...(await courseProgress(U, "ary")).keys()]).toEqual(["ary-a1-01"]);
  });

  it("tells each lesson and part exam's course from its id", () => {
    for (const course of COURSE_IDS)
      for (const part of COURSES[course].parts)
        for (const id of [part.id, ...part.lessons]) expect(courseOfId(id), id).toBe(course);
  });

  it("gives every exam a unique id across courses (results are logged by id)", () => {
    const ids = COURSE.flatMap((part) => part.exams.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("Quiet mode word choices", () => {
  it("offers the word and others of the same course, level and kind", async () => {
    await db.insert(notes).values(
      ["salam", "bzzaf", "chokran", "safi", "wakha"].map((id, ord) => ({
        id: `ary:${id}`,
        course: "ary",
        source: "ary-word",
        cefr: "A1",
        ord,
        de: id,
        tr: id,
        en: id,
      })),
    );
    const [salam] = await db.select().from(notes).where(eq(notes.id, "ary:salam"));
    if (!salam) throw new Error("no note");
    const { options, answer } = await wordChoices(salam, "seed");
    expect(options).toHaveLength(4);
    expect(options[answer]?.de).toBe("salam");
    // German test words (course de) never show up in a Darija card.
    expect(options.every((o) => o.tr)).toBe(true);
  });

  it("keeps German nouns with nouns", async () => {
    await seedWords(db, ["das Haus", "die Katze", "der Hund", "laufen", "schnell"]);
    const [haus] = await db.select().from(notes).where(eq(notes.id, "das Haus"));
    if (!haus) throw new Error("no note");
    const { options } = await wordChoices(haus, "seed");
    expect(options.every((o) => /^(der|die|das) /.test(o.de))).toBe(true);
  });
});
