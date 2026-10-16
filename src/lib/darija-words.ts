import { z } from "zod";

/** One entry of data/darija/words.json: a word or a phrase, Arabic + Latin, French gloss. */
export const DarijaWord = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  de: z.string().describe("Arabic script, no Latin letters"),
  tr: z.string().describe("Latin (Arabizi), see data/darija/README.md"),
  en: z.string().describe("French gloss"),
  phrase: z.boolean().optional(),
  exampleDe: z.string().optional(),
  exampleTr: z.string().optional(),
  exampleEn: z.string().optional(),
});
export type DarijaWord = z.infer<typeof DarijaWord>;

/** Problems in the list: duplicate ids, Latin in the Arabic, an example missing its Latin. */
export function wordProblems(words: DarijaWord[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const w of words) {
    if (ids.has(w.id)) problems.push(`${w.id}: duplicate id`);
    ids.add(w.id);
    for (const text of [w.de, w.exampleDe ?? ""])
      if (/[a-zà-ÿ]/i.test(text)) problems.push(`${w.id}: Latin letters in "${text}"`);
    if (Boolean(w.exampleDe) !== Boolean(w.exampleTr))
      problems.push(`${w.id}: example needs both scripts`);
  }
  return problems;
}
