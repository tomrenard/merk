"use server";

import { requireUser } from "@/lib/session";
import { findWords } from "@/lib/words";

/** The next page of the word list, for scrolling. */
export async function moreWords(q: string, filter: string, offset: number) {
  const userId = await requireUser();
  const from = Number(offset);
  if (!Number.isInteger(from) || from < 0) throw new Error("Bad offset");
  return findWords(userId, String(q).slice(0, 100), String(filter), from);
}
