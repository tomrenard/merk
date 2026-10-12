import { and, asc, eq, ilike, isNull, ne, or, type SQL, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { cards, notes } from "@/db/schema";
import { KNOWN } from "@/lib/review";
import { requireUser } from "@/lib/session";
import { Headword } from "../review/German";
import { TabBar } from "../TabBar";

export const dynamic = "force-dynamic";

/** Long lists are cut here; search or a filter narrows them. */
const SHOWN = 200;

/** Word filters: by where you are with a word, by level, or by kind. */
const FILTERS: { key: string; label: string; where: SQL }[] = [
  { key: "new", label: "New", where: sql`${cards.introducedAt} is null` },
  {
    key: "learning",
    label: "Learning",
    where: sql`${cards.introducedAt} is not null and not ${KNOWN}`,
  },
  { key: "known", label: "⭐ Known", where: KNOWN },
  {
    key: "tricky",
    label: "🧠 Tricky",
    where: sql`coalesce((${cards.fsrs}->>'lapses')::int, 0) >= 2`,
  },
  { key: "A1", label: "A1", where: sql`${notes.cefr} = 'A1'` },
  { key: "A2", label: "A2", where: sql`${notes.cefr} = 'A2'` },
  { key: "B1", label: "B1", where: sql`${notes.cefr} = 'B1'` },
  { key: "phrases", label: "Phrases", where: sql`${notes.source} = 'phrase'` },
  { key: "mine", label: "Mine", where: sql`${notes.source} = 'mine'` },
];

export default async function WordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const userId = await requireUser();
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const filter = FILTERS.find((f) => f.key === params.filter);
  // Matched literally: % and _ would otherwise be ILIKE wildcards.
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const words = await db()
    .select({ id: notes.id, de: notes.de, en: notes.en, cefr: notes.cefr, due: cards.due })
    .from(notes)
    .leftJoin(
      cards,
      and(eq(cards.noteId, notes.id), eq(cards.userId, userId), eq(cards.direction, "de_en")),
    )
    .where(
      and(
        q ? or(ilike(notes.de, pattern), ilike(notes.en, pattern)) : undefined,
        filter?.where,
        ne(notes.source, "unit"),
        // Shared words, plus your own (not someone else's).
        or(eq(notes.userId, userId), and(isNull(notes.userId), ne(notes.source, "mine"))),
      ),
    )
    .orderBy(asc(notes.ord))
    .limit(SHOWN + 1);
  return (
    <main className="screen with-tabs">
      <header className="topbar">
        <h1 className="text-3xl font-black">Words</h1>
        <Link href="/words/new" className="chip bg-[var(--brand-soft)] text-[var(--brand)]">
          + Add
        </Link>
      </header>
      <form>
        {filter && <input type="hidden" name="filter" value={filter.key} />}
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
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filters">
        {[{ key: "", label: "All" }, ...FILTERS].map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/words?filter=${f.key}` : "/words"}
            className={`chip shrink-0 border-2 ${(filter?.key ?? "") === f.key ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]" : "line muted"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <p className="muted -mt-2 text-sm font-bold">
        {words.length > SHOWN
          ? `First ${SHOWN}: search to find more`
          : `${words.length} ${q ? "found" : "words"}`}
      </p>
      <ul className="card flex flex-col divide-y-2 divide-[var(--line)] py-0">
        {words.slice(0, SHOWN).map((word) => (
          <li key={word.id}>
            <Link
              href={`/words/${encodeURIComponent(word.id)}`}
              className="flex items-baseline justify-between gap-3 py-3"
            >
              <span>
                <Headword de={word.de} className="font-extrabold" />{" "}
                <span className="muted">{word.en}</span>
              </span>
              <span className="muted shrink-0 text-xs font-bold">
                {word.cefr} · {word.due ? word.due.toLocaleDateString("de-DE") : "new"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <TabBar active="/words" />
    </main>
  );
}
