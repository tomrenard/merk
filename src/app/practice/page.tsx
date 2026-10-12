import { type PracticeScope, practiceWords } from "@/lib/review";
import { requireUser } from "@/lib/session";
import { TabBar } from "../TabBar";
import { Practice } from "./Practice";

export const dynamic = "force-dynamic";

const SCOPES = [
  {
    scope: "today",
    icon: "☀️",
    tint: "bg-amber-100 dark:bg-amber-950",
    title: "Today's words",
    text: "What you studied today",
  },
  {
    scope: "all",
    icon: "🗂️",
    tint: "bg-sky-100 dark:bg-sky-950",
    title: "All my words",
    text: "Anything you've seen so far",
  },
  {
    scope: "tricky",
    icon: "🧠",
    tint: "bg-rose-100 dark:bg-rose-950",
    title: "Tricky words",
    text: "The ones you keep forgetting",
  },
] as const;

/** Without `scope`: pick a set. With it: a round of up to 20 words. */
export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const raw = (await searchParams).scope;
  const scope: PracticeScope | null =
    raw === "all" || raw === "today" || raw === "tricky" ? raw : null;
  const words = scope ? await practiceWords(await requireUser(), scope) : [];
  if (scope && words.length) return <Practice words={words} scope={scope} />;
  return (
    <main className="screen with-tabs">
      <header>
        <h1 className="text-3xl font-black">Practice</h1>
        <p className="muted font-semibold">Extra practice: it doesn't change your schedule.</p>
      </header>
      {scope && (
        <p className="card text-center font-bold">
          {scope === "today"
            ? "Nothing studied today yet: try all your words."
            : scope === "tricky"
              ? "No tricky words: nice!"
              : "No words studied yet."}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {SCOPES.map((s) => (
          <li key={s.scope}>
            {/* A full load, so the server picks a fresh random set. */}
            <a href={`/practice?scope=${s.scope}`} className="card flex items-center gap-3">
              <span className={`icon ${s.tint}`}>{s.icon}</span>
              <span className="flex-1">
                <span className="block font-extrabold">{s.title}</span>
                <span className="muted text-sm font-semibold">{s.text}</span>
              </span>
              <span className="muted text-2xl font-black">›</span>
            </a>
          </li>
        ))}
        <li>
          <a href="/practice/sounds" className="card flex items-center gap-3">
            <span className="icon bg-pink-100 dark:bg-pink-950">👂</span>
            <span className="flex-1">
              <span className="block font-extrabold">Sounds that look alike</span>
              <span className="muted text-sm font-semibold">Kiste or Küste? Miete or Mitte?</span>
            </span>
            <span className="muted text-2xl font-black">›</span>
          </a>
        </li>
        <li>
          <a href="/practice/numbers" className="card flex items-center gap-3">
            <span className="icon bg-green-100 dark:bg-green-950">🔢</span>
            <span className="flex-1">
              <span className="block font-extrabold">Numbers & time by ear</span>
              <span className="muted text-sm font-semibold">
                Prices, times, phone numbers, spelled names
              </span>
            </span>
            <span className="muted text-2xl font-black">›</span>
          </a>
        </li>
      </ul>
      <TabBar active="/practice" />
    </main>
  );
}
