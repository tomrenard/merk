import { PARTS_OF_COURSE } from "./parts";

/**
 * The languages you can learn. Each has its own lessons, cards and progress; the streak and the
 * daily new-word setting are shared. Client-safe (no database).
 */
export const COURSES = {
  de: {
    name: "German",
    flag: "🇩🇪",
    parts: PARTS_OF_COURSE.map((part) => ({ ...part, level: part.id.slice(0, 2) })),
    /** Goethe-style exams at the end of each level. */
    levelExams: true,
    placement: true,
    /** Sounds, numbers by ear, der/die/das colours. */
    germanTools: true,
  },
  ary: {
    name: "Moroccan Darija",
    flag: "🇲🇦",
    // Lesson ids start with "ary-", so they never clash with German ones.
    parts: [
      { id: "ary-A1.1", level: "A1", lessons: ["ary-a1-01"] as string[] },
      { id: "ary-A1.2", level: "A1", lessons: [] as string[] },
    ],
    levelExams: false,
    placement: false,
    germanTools: false,
  },
} as const;

export type CourseId = keyof typeof COURSES;
export const COURSE_IDS = Object.keys(COURSES) as CourseId[];
export const COURSE_COOKIE = "merk-course";

export const isCourseId = (value: unknown): value is CourseId =>
  COURSE_IDS.includes(value as CourseId);

/** A lesson's or exam's course, from its id: Darija ids start with "ary-" (see courses.test.ts). */
export const courseOfId = (id: string): CourseId => (id.startsWith("ary-") ? "ary" : "de");

/** A part's or exam's name as shown: "A1.1", not the "ary-A1.1" it is stored as. */
export const shownId = (id: string) => id.replace(/^ary-/, "");

/** Short praise and prompts in the language being learned, as a teacher would say them. */
type Cheers = Record<
  | "right"
  | "heard"
  | "spoke"
  | "wrote"
  | "perfect"
  | "good"
  | "veryGood"
  | "passed"
  | "doneToday"
  | "write"
  | "type",
  string
>;
export const CHEERS: Record<CourseId, Cheers> = {
  de: {
    right: "Richtig!",
    heard: "Gut gehört!",
    spoke: "Toll gesprochen!",
    wrote: "Gut geschrieben!",
    perfect: "Perfekt!",
    good: "Gut gemacht!",
    veryGood: "Sehr gut!",
    passed: "bestanden!",
    doneToday: "Fertig für heute!",
    write: "Auf Deutsch…",
    type: "Auf Deutsch… (ae, oe, ue, ss ok)",
  },
  ary: {
    right: "Mzyan!",
    heard: "Sme3ti mzyan!",
    spoke: "Hdarti mzyan!",
    wrote: "Ktebti mzyan!",
    perfect: "Top!",
    good: "Bravo!",
    veryGood: "Bzzaf mzyan!",
    passed: "nja7ti!",
    doneToday: "Safi, salina l-youm!",
    write: "B darija, en lettres latines…",
    type: "B darija… (3, 7, 9, ch, kh, gh)",
  },
};
