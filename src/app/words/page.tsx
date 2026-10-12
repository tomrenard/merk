import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { cards, notes } from "@/db/schema";
import { KNOWN } from "@/lib/review";
import { Headword } from "../review/German";

export const dynamic = "force-dynamic";

export default async function WordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; known?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const known = params.known === "1";
  // Matched literally: % and _ would otherwise be ILIKE wildcards.
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const words = await db()
    .select({ id: notes.id, de: notes.de, en: notes.en, cefr: notes.cefr, due: cards.due })
    .from(notes)
    .leftJoin(cards, eq(cards.id, sql`${notes.id} || ':de_en'`))
    .where(
      and(
        q ? or(ilike(notes.de, pattern), ilike(notes.en, pattern)) : undefined,
        known ? KNOWN : undefined,
      ),
    )
    .orderBy(asc(notes.ord));
  return (
    <main className="screen">
      <header className="topbar">
        <Link href="/" className="pill">
          ← merk
        </Link>
        <span className="pill">
          {words.length} {q ? "found" : known ? "known" : "words"}
        </span>
      </header>
      <form>
        <input
          name="q"
          type="search"
          defaultValue={q}
          lang="de"
          autoCapitalize="off"
          placeholder="Search German or English…"
          aria-label="Search words"
          className="field w-full"
        />
      </form>
      <ul className="card backdrop-blur-none flex flex-col divide-y divide-current/10 py-2">
        {words.map((word) => (
          <li key={word.id}>
            <Link
              href={`/words/${encodeURIComponent(word.id)}`}
              className="flex items-baseline justify-between gap-3 py-2"
            >
              <span>
                <Headword de={word.de} className="font-bold" />{" "}
                <span className="muted">{word.en}</span>
              </span>
              <span className="muted shrink-0 text-xs font-semibold">
                {word.cefr} · {word.due ? word.due.toLocaleDateString("de-DE") : "new"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
