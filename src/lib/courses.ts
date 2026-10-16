import { PARTS_OF_COURSE } from "./units";

/**
 * The languages you can learn. Each has its own lessons, cards and progress; the streak and the
 * daily new-word setting are shared. Client-safe (no database).
 */
export const COURSES = {
  de: {
    id: "de",
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
    id: "ary",
    name: "Moroccan Darija",
    flag: "🇲🇦",
    // Lesson ids start with "ary-", so they never clash with German ones.
    parts: [
      { id: "ary-A1.1", level: "A1", lessons: [] as string[] },
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
