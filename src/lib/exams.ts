import { z } from "zod";

/**
 * A level exam (A1, A2, B1, B2) modelled on the Goethe certificate: Hören, Lesen, Sprachbausteine
 * (grammar and vocabulary) and Schreiben/Sprechen. Listening, reading and grammar are checked by
 * the app; writing and speaking are self-assessed against a checklist and a model answer.
 * Content lives in data/exams/<level>.json.
 */
const Question = z.object({
  q: z.string().describe("question in English (A1/A2) or German (B1/B2)"),
  options: z.array(z.string()).min(2).max(4),
  answer: z.number().int(),
});

const ChoiceItem = z.object({
  de: z.string().describe('German sentence with exactly one "___" gap'),
  options: z.array(z.string()).min(3).max(4),
  answer: z.number().int(),
  why: z.string(),
});

const Performance = z.object({
  task: z.string().describe("the task in English, as in the exam"),
  model: z.string().describe("a model answer in German at the level"),
  checklist: z.array(z.string()).min(3).max(6).describe("what a passing answer must do, English"),
});

export const Exam = z.object({
  id: z.string(),
  cefr: z.enum(["A1", "A2", "B1", "B2"]),
  title: z.string(),
  hoeren: z
    .array(
      z.object({
        title: z.string(),
        intro: z.string(),
        lines: z
          .array(z.object({ speaker: z.string(), de: z.string(), en: z.string() }))
          .min(2)
          .max(30),
        questions: z.array(Question).min(2).max(5),
      }),
    )
    .min(3)
    .max(4),
  lesen: z
    .array(
      z.object({
        title: z.string(),
        text: z.string().describe("a German text: notice, ad, email, article"),
        questions: z.array(Question).min(2).max(5),
      }),
    )
    .min(3)
    .max(4),
  sprachbausteine: z.array(ChoiceItem).min(10).max(15),
  schreiben: z.array(Performance).min(1).max(2),
  sprechen: z.array(Performance).min(2).max(3),
});
export type Exam = z.infer<typeof Exam>;

export function examProblems(exam: Exam): string[] {
  const problems: string[] = [];
  const all = [
    ...exam.hoeren.flatMap((t) => t.questions),
    ...exam.lesen.flatMap((t) => t.questions),
    ...exam.sprachbausteine,
  ];
  for (const [i, q] of all.entries())
    if (!q.options[q.answer]) problems.push(`question ${i + 1}: answer out of range`);
  for (const [i, item] of exam.sprachbausteine.entries()) {
    if (item.de.split("___").length !== 2)
      problems.push(`sprachbaustein ${i + 1}: needs one ___ gap`);
  }
  return problems;
}
