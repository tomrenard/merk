import { notFound } from "next/navigation";
import {
  CHECK_SIZE,
  COURSE,
  courseOfUnit,
  courseProgress,
  PARTS,
  PASS,
  partIcon,
  partLabel,
  unitById,
} from "@/lib/course";
import { getT } from "@/lib/locale";
import { requireUser } from "@/lib/session";
import { Go } from "../../Nav";
import { TabBar } from "../../TabBar";
import { learnWords } from "../actions";

export const dynamic = "force-dynamic";

/** A unit's four parts, one a day: grammar, listen & read, speak, write. */
export default async function UnitPage({ params }: { params: Promise<{ id: string }> }) {
  const unit = unitById((await params).id);
  if (!unit) notFound();
  const done =
    (await courseProgress(await requireUser(), courseOfUnit(unit))).get(unit.id) ?? new Map();
  const next = PARTS.find((part) => !done.has(part.kind));
  const t = await getT();
  return (
    <main className="screen with-tabs">
      <header className="topbar">
        <Go href="/learn" className="muted text-lg font-black" aria-label={t("Back to the course")}>
          ‹ {t("Course")}
        </Go>
        <span className="chip muted line border">
          {COURSE.find((c) => c.units.includes(unit))?.id ?? unit.cefr}
        </span>
      </header>
      <div>
        <p className="muted text-sm font-extrabold">{unit.situation}</p>
        <h1 className="text-3xl font-black">
          <span aria-hidden="true">{unit.icon}</span> {unit.title}
        </h1>
        <p className="muted mt-1 font-semibold">{unit.canDo}</p>
      </div>
      <ol className="flex flex-col gap-3">
        {PARTS.map((part) => {
          const score = done.get(part.kind);
          const retry = part.kind === "unit" && score !== undefined && score < PASS;
          return (
            <li key={part.kind}>
              <Go
                href={`/learn/${unit.id}/${part.path}`}
                className={`card flex items-center gap-3 ${part === next ? "border-[var(--brand)]" : ""}`}
              >
                <span
                  className={`icon ${score !== undefined && !retry ? "bg-green-100 dark:bg-green-950" : "bg-[var(--field)]"}`}
                >
                  {score !== undefined && !retry ? "✓" : partIcon(unit, part)}
                </span>
                <span className="flex-1 font-extrabold">
                  {partLabel(unit, part, t)}
                  {retry && (
                    <span className="muted block text-sm font-semibold">
                      {t("Check again: {score}/{size}", { score, size: CHECK_SIZE })}
                    </span>
                  )}
                </span>
                <span className="muted text-2xl font-black">›</span>
              </Go>
            </li>
          );
        })}
      </ol>
      <p className="muted text-center text-sm font-semibold">
        {t("One part a day is plenty. Redo any part any time.")}
      </p>
      {(done.get("unit") ?? 0) < PASS && (
        <Go href={`/learn/${unit.id}/grammar?test=1`} className="btn">
          {t("Already know this? Take the check")}
        </Go>
      )}
      {unit.words?.length ? (
        <form action={learnWords}>
          <input type="hidden" name="unit" value={unit.id} />
          <button type="submit" className="btn w-full">
            🌱 {t("Learn this topic's {n} words next", { n: unit.words.length })}
          </button>
        </form>
      ) : null}
      <TabBar active="/learn" />
    </main>
  );
}
