import { COURSE } from "@/lib/course";
import type { Exam } from "@/lib/exams";
import { shuffled } from "@/lib/shuffle";
import type { UnitItem } from "@/lib/units";
import a1 from "../../../data/exams/a1.json";
import a2 from "../../../data/exams/a2.json";
import b1 from "../../../data/exams/b1.json";
import b2 from "../../../data/exams/b2.json";

/** The level exams (Goethe-style), by level. */
export const LEVEL_EXAMS = { A1: a1, A2: a2, B1: b1, B2: b2 } as Record<string, Exam>;

export type PartExamPacket = {
  items: UnitItem[];
  listening: { de: string; options: string[]; answer: number }[];
  /** `tr`: Darija only, the Latin you type. */
  dictation: { de: string; tr?: string }[];
};

/**
 * A part exam drawn at random from the part's lessons: 12 exercises (main parts of all
 * lessons), 2 lines to understand by ear, 2 sentences to write from dictation.
 */
export function partExamPacket(partId: string): PartExamPacket | null {
  const part = COURSE.find((p) => p.id === partId);
  if (!part) return null;
  const items = shuffled(part.units.flatMap((unit) => unit.items)).slice(0, 12);
  const lines = shuffled(part.units.flatMap((unit) => unit.listening.lines)).filter(
    (line, i, all) => all.findIndex((l) => l.en === line.en) === i,
  );
  const listening = lines.slice(0, 2).map((line, i) => {
    const options = shuffled([line.en, ...lines.slice(2 + i * 3, 5 + i * 3).map((l) => l.en)]);
    return { de: line.de, options, answer: options.indexOf(line.en) };
  });
  const dictation = shuffled(
    part.units.flatMap((unit) =>
      unit.dictation.map((de, i) => ({ de, tr: unit.dictationTr?.[i] })),
    ),
  ).slice(0, 2);

  return { items, listening, dictation };
}
