import Link from "next/link";
import { getCourse, getT } from "@/lib/locale";
import { requireUser } from "@/lib/session";
import { countWords, FILTERS, findWords, PAGE } from "@/lib/words";
import { Go } from "../Nav";
import { TabBar } from "../TabBar";
import { WordList } from "./WordList";

export const dynamic = "force-dynamic";

export default async function WordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const userId = await requireUser();
  const [t, course] = await Promise.all([getT(), getCourse()]);
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const filter = FILTERS.find((f) => f.key === params.filter);
  const [words, total] = await Promise.all([
    findWords(userId, course, q, filter?.key ?? "", 0),
    countWords(userId, course, q, filter?.key ?? ""),
  ]);
  return (
    <main className="screen with-tabs">
      <header className="topbar">
        <h1 className="text-3xl font-black">{t("Words")}</h1>
        <Go href="/words/new" className="chip bg-[var(--brand-soft)] text-[var(--brand)]">
          + {t("Add")}
        </Go>
      </header>
      <form>
        {filter && <input type="hidden" name="filter" value={filter.key} />}
        <input
          name="q"
          type="search"
          defaultValue={q}
          lang="de"
          autoCapitalize="off"
          placeholder={t("Search German or English…")}
          aria-label={t("Search words")}
          className="field w-full"
        />
      </form>
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label={t("Filters")}>
        {[{ key: "", label: "All" }, ...FILTERS].map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/words?filter=${f.key}` : "/words"}
            className={`chip shrink-0 border ${(filter?.key ?? "") === f.key ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]" : "line muted"}`}
          >
            {t(f.label)}
          </Link>
        ))}
      </nav>
      <p className="muted -mt-2 text-sm font-bold">
        {q ? t("{n} found", { n: total }) : t("{n} words", { n: total })}
      </p>
      <WordList
        key={`${q}|${filter?.key ?? ""}`}
        first={words}
        total={total}
        page={PAGE}
        q={q}
        filter={filter?.key ?? ""}
      />
      <TabBar active="/words" />
    </main>
  );
}
