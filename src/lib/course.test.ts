import { describe, expect, it } from "vitest";
import {
  COURSE,
  type CourseExam,
  currentPart,
  examPassed,
  nextStep,
  PARTS,
  PASS,
  type Progress,
  UNITS,
  unitDone,
} from "./course";
import type { Unit } from "./units";

const all = (score = PASS) =>
  new Map(PARTS.map((part) => [part.kind, part.kind === "unit" ? score : 1]));
const exams = (score: number): Progress =>
  new Map(
    COURSE.flatMap((part) => part.exams).map((exam) => [
      `exam:${exam.id}`,
      new Map([["unit", score]]),
    ]),
  );

describe("nextStep", () => {
  const [first, second] = UNITS.map((unit) => unit.id);

  it("starts with the first lesson's main part", () => {
    expect(nextStep(new Map())).toMatchObject({ unit: { id: first }, part: { kind: "unit" } });
  });

  it("goes through a lesson's parts, then the next lesson, even after a failed check", () => {
    const progress: Progress = new Map([[first ?? "", new Map([["unit", 0]])]]);
    expect(nextStep(progress)).toMatchObject({ part: { kind: "listen" } });
    progress.set(first ?? "", all(0));
    expect(nextStep(progress)).toMatchObject({ unit: { id: second }, part: { kind: "unit" } });
  });

  it("resumes the lesson last worked on", () => {
    const third = UNITS[2]?.id ?? "";
    const progress: Progress = new Map([[third, new Map([["unit", PASS]])]]);
    expect(nextStep(progress, third)).toMatchObject({
      unit: { id: third },
      part: { kind: "listen" },
    });
    expect(nextStep(progress)).toMatchObject({ unit: { id: first } });
  });

  it("waits at a part's exam until it is passed", () => {
    const [part, after] = COURSE;
    const progress: Progress = new Map(part?.units.map((unit) => [unit.id, all()]));
    expect(nextStep(progress)).toMatchObject({ type: "exam", exam: { id: part?.id } });
    progress.set(`exam:${part?.id}`, new Map([["unit", 50]]));
    expect(nextStep(progress)).toMatchObject({ type: "exam", exam: { id: part?.id } });
    progress.set(`exam:${part?.id}`, new Map([["unit", 80]]));
    expect(nextStep(progress)).toMatchObject({ type: "lesson", unit: { id: after?.units[0]?.id } });
  });

  it("comes back to failed checks once everything was done, then is finished", () => {
    const progress: Progress = new Map([
      ...exams(100),
      ...UNITS.map((unit) => [unit.id, all()] as const),
    ]);
    progress.set(second ?? "", all(0));
    expect(nextStep(progress)).toMatchObject({ unit: { id: second }, part: { kind: "unit" } });
    progress.set(second ?? "", all());
    expect(nextStep(progress)).toBeNull();
  });
});

describe("currentPart", () => {
  it("stays on a part until its lessons are done and its exam passed", () => {
    const [part, after] = COURSE;
    expect(currentPart(new Map())?.id).toBe(part?.id);
    const progress: Progress = new Map(part?.units.map((unit) => [unit.id, all()]));
    expect(currentPart(progress)?.id).toBe(part?.id);
    for (const [ref, score] of exams(100)) progress.set(ref, score);
    expect(currentPart(progress)?.id).toBe(after?.id);
  });
});

describe("currentPart after a failed check", () => {
  it("moves on like nextStep: a failed check doesn't hold the part", () => {
    const [part, after] = COURSE;
    const progress: Progress = new Map(part?.units.map((unit) => [unit.id, all(0)]));
    for (const [ref, score] of exams(100)) progress.set(ref, score);
    expect(currentPart(progress)?.id).toBe(after?.id);
  });
});

describe("skipped by the placement test", () => {
  it("walks past skipped lessons and exams without counting them as done", () => {
    const [part, after] = COURSE;
    const progress: Progress = new Map();
    progress.skipped = new Set([
      ...(part?.units.map((unit) => unit.id) ?? []),
      ...(part?.exams.map((exam) => `exam:${exam.id}`) ?? []),
    ]);
    expect(nextStep(progress, part?.units[0]?.id)).toMatchObject({
      unit: { id: after?.units[0]?.id },
    });
    expect(currentPart(progress)?.id).toBe(after?.id);
    expect(part && unitDone(progress, part.units[0] as Unit)).toBe(false);
    expect(part && examPassed(progress, part.exams[0] as CourseExam)).toBe(false);
  });
});
