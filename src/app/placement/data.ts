import { and, asc, eq, isNull, notInArray } from "drizzle-orm";
import { db } from "@/db/client";
import { notes } from "@/db/schema";
import { quietItem } from "@/lib/choices";
import { kindOf, partsOf, unitsOf } from "@/lib/course";
import type { Band, Level } from "@/lib/placement";
import { shuffled } from "@/lib/shuffle";
import type { UnitItem } from "@/lib/units";

/** Placement exists for German only (see src/lib/courses.ts). */
const UNITS = unitsOf("de");
const BAND_SIZE = 320;
export const LEVELS: Level[] = ["A1", "A2", "B1", "B2"];
/** The grammar search runs over the grammar lessons only; topics and stories sit between them. */
const GRAMMAR = UNITS.filter((unit) => kindOf(unit) === "grammar");

/** The shared word lists cut into frequency bands of ~320 words per level (same cut every time). */
export async function wordBands() {
  const words = await db()
    .select({ id: notes.id, de: notes.de, en: notes.en, cefr: notes.cefr })
    .from(notes)
    .where(
      and(
        isNull(notes.userId),
        eq(notes.course, "de"),
        notInArray(notes.source, ["phrase", "unit", "mine"]),
      ),
    )
    .orderBy(asc(notes.ord));
  let id = 0;
  return LEVELS.flatMap((level) => {
    const list = words.filter((w) => w.cefr === level);
    const count = Math.max(1, Math.round(list.length / BAND_SIZE));
    const size = Math.ceil(list.length / count);
    return Array.from({ length: count }, (_, i) => ({
      band: { id: id++, level, size: list.slice(i * size, (i + 1) * size).length } as Band,
      words: list.slice(i * size, (i + 1) * size),
    }));
  });
}

export type VocabWord = {
  band: number;
  noteId: string;
  de: string;
  options: string[];
  answer: number;
};

/** Everything the test needs, picked at random on the server; the phone runs the adaptive part. */
export async function placementPacket(quiet = false) {
  const bands = await wordBands();
  const vocab = bands.map(({ band, words }) => {
    const picked = shuffled(words).slice(0, 10);
    return picked.map((word): VocabWord => {
      const others = shuffled(words.filter((w) => w.id !== word.id && w.en !== word.en)).slice(
        0,
        3,
      );
      const options = shuffled([word.en, ...others.map((o) => o.en)]);
      return {
        band: band.id,
        noteId: word.id,
        de: word.de,
        options,
        answer: options.indexOf(word.en),
      };
    });
  });
  // Three items per unit, of different kinds where possible.
  const grammar = GRAMMAR.map((unit) => {
    const byType = (["choice", "cloze", "order"] as const).map(
      (type) => shuffled(unit.items.filter((item) => item.type === type))[0],
    );
    const items = byType.filter((item): item is UnitItem => Boolean(item));
    return [...items, ...shuffled(unit.items)]
      .filter((item, i, all) => all.indexOf(item) === i)
      .slice(0, 3)
      .map((item) => (quiet ? quietItem(unit, item) : item));
  });
  const listening = LEVELS.map((level) => {
    const lines = shuffled(
      UNITS.filter((u) => u.cefr === level).flatMap((u) => u.listening.lines),
    ).filter((line, i, all) => all.findIndex((l) => l.en === line.en) === i);
    return lines.slice(0, 3).map((line, i) => {
      const options = shuffled([line.en, ...lines.slice(3 + i * 3, 6 + i * 3).map((l) => l.en)]);
      return { de: line.de, options, answer: options.indexOf(line.en) };
    });
  });
  return {
    bands: bands.map((b) => b.band),
    vocab,
    grammar,
    listening,
    units: GRAMMAR.map((u) => ({ id: u.id, title: u.title, cefr: u.cefr })),
    // Where each grammar lesson sits in the whole course, to turn the search into a start lesson.
    grammarAt: GRAMMAR.map((u) => UNITS.indexOf(u)),
    course: partsOf("de").map((part) => ({
      id: part.id,
      lessons: part.units.map((u) => ({ index: UNITS.indexOf(u), title: u.title })),
    })),
  };
}

export type Packet = Awaited<ReturnType<typeof placementPacket>>;
