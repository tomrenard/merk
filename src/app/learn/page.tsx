import Link from "next/link";
import {
  COURSE,
  type CourseExam,
  courseProgress,
  currentPart,
  examPassed,
  examScore,
  examTitle,
  isSkipped,
  lastUnitId,
  levelName,
  nextStep,
  PARTS,
  type Progress,
  partIcon,
  partLabel,
  partProgress,
  UNITS,
  unitDone,
} from "@/lib/course";
import type { T } from "@/lib/i18n";
import { getT } from "@/lib/locale";
import { requireUser } from "@/lib/session";
import { Go } from "../Nav";
import { TabBar } from "../TabBar";

export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "path", label: "Path", icon: "🧭" },
  ...PARTS.map((p) => ({
    key: p.path,
    label: p.kind === "unit" ? "Lessons" : p.label,
    icon: p.icon,
  })),
];

function ExamCard({
  exam,
  progress,
  isNext,
  t,
}: {
  exam: CourseExam;
  progress: Progress;
  isNext: boolean;
  t: T;
}) {
  const score = examScore(progress, exam);
  const passed = examPassed(progress, exam);
  const skipped = !passed && isSkipped(progress, `exam:${exam.id}`);
  return (
    <Go
      href={`/exam/${exam.id}`}
      className={`card flex items-center gap-3 ${isNext ? "border-[var(--brand)]" : ""} ${exam.type === "level" ? "bg-[var(--brand-soft)]" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`icon ${passed ? "bg-green-100 dark:bg-green-950" : "bg-amber-100 dark:bg-amber-950"}`}
      >
        {passed ? "✓" : exam.type === "level" ? "🏆" : "📝"}
      </span>
      <span className="flex-1">
        <span className="block font-extrabold">
          {exam.type === "level"
            ? t("{exam} (like the Goethe exam)", { exam: examTitle(exam, t) })
            : examTitle(exam, t)}
        </span>
        <span className="muted text-sm font-semibold">
          {passed
            ? t("Passed · best {score}%", { score: score ?? 0 })
            : skipped
              ? t("Skipped by your placement test")
              : score !== undefined
                ? t("Best {score}% · {pass}% to pass", { score, pass: exam.pass })
                : t("{pass}% to pass", { pass: exam.pass })}
        </span>
      </span>
      <span aria-hidden="true" className="muted text-2xl font-black">
        ›
      </span>
    </Go>
  );
}

/** The whole course by part (A1.1 …), each closed by an exam; or one skill across all lessons. */
export default async function CoursePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const userId = await requireUser();
  const t = await getT();
  const [progress, last] = await Promise.all([courseProgress(userId), lastUnitId(userId)]);
  const asked = (await searchParams).view;
  const view = VIEWS.find((v) => v.key === asked)?.key ?? "path";
  const part = PARTS.find((p) => p.path === view);
  const next = nextStep(progress, last, t);
  const current = currentPart(progress);
  return (
    <main className="screen with-tabs">
      <header>
        <h1 className="text-3xl font-black">{t("Course")}</h1>
        <p className="muted font-semibold">
          {t("A1 → B2 for everyday life. Follow the path or pick anything.")}
        </p>
        <Go href="/placement" className="text-sm font-bold text-[var(--brand)]">
          {t("Not sure where to start? Find your level")} ›
        </Go>
      </header>
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label={t("Course views")}>
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={v.key === "path" ? "/learn" : `/learn?view=${v.key}`}
            className={`chip shrink-0 border ${v.key === view ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]" : "line muted"}`}
          >
            <span aria-hidden="true">{v.icon}</span> {t(v.label)}
          </Link>
        ))}
      </nav>
      {COURSE.map((section, i) => {
        const finished = part
          ? section.units.filter((unit) => progress.get(unit.id)?.has(part.kind)).length
          : partProgress(progress, section).done;
        const passed = partProgress(progress, section).passed;
        const skipped = section.units.filter(
          (unit) => isSkipped(progress, unit.id) && !unitDone(progress, unit),
        ).length;
        const newLevel = COURSE[i - 1]?.level !== section.level;
        return (
          <section key={section.id} id={section.id} className="flex flex-col gap-3">
            {newLevel && (
              <h2 className="mt-2 text-2xl font-black">
                {section.level}{" "}
                <span className="muted text-base font-bold">{levelName(section.level, t)}</span>
              </h2>
            )}
            {/* Only the part you are in is open; the others fold to one line. */}
            <details
              open={
                section.id === current?.id ||
                (next?.type === "lesson" && section.units.includes(next.unit))
              }
              className="group"
            >
              <summary className="card flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                <span className="flex-1">
                  <span className="block font-extrabold">
                    {section.id}
                    {passed && !part && " ✓"}
                  </span>
                  <span className="mt-1 block h-2 overflow-hidden rounded-full bg-[var(--line)]">
                    <span
                      className="block h-full rounded-full bg-[var(--brand)]"
                      style={{ width: `${Math.round((100 * finished) / section.units.length)}%` }}
                    />
                  </span>
                </span>
                <span className="muted text-sm font-bold">
                  {finished}/{section.units.length}
                  {skipped > 0 && !part && ` · ${t("{n} skipped", { n: skipped })}`}
                </span>
                <span
                  aria-hidden="true"
                  className="muted text-xl font-black transition-transform group-open:rotate-90"
                >
                  ›
                </span>
              </summary>
              <ol className="mt-3 flex flex-col gap-3">
                {section.units.map((unit) => {
                  const done = progress.get(unit.id) ?? new Map();
                  const isDone = part ? done.has(part.kind) : unitDone(progress, unit);
                  const isNext =
                    next?.type === "lesson" && next.unit === unit && (!part || next.part === part);
                  const href = part ? `/learn/${unit.id}/${part.path}` : `/learn/${unit.id}`;
                  return (
                    <li key={unit.id}>
                      <Go
                        href={href}
                        className={`card flex items-center gap-3 ${isNext ? "border-[var(--brand)]" : ""}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`icon text-xl font-black ${
                            isDone
                              ? "bg-green-100 dark:bg-green-950"
                              : isNext
                                ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                                : "bg-[var(--field)]"
                          }`}
                        >
                          {part ? (isDone ? "✓" : partIcon(unit, part)) : unit.icon}
                        </span>
                        <span className="flex-1">
                          <span className="block font-extrabold">
                            {unit.title}
                            {!part && isDone && " ✓"}
                          </span>
                          <span className="muted text-sm font-semibold">
                            {!part && `${partLabel(unit, PARTS[0], t)} · `}
                            {unit.situation}
                            {!part &&
                              done.size > 0 &&
                              !isDone &&
                              ` · ${t("{done}/{total} parts", { done: done.size, total: PARTS.length })}`}
                            {!isDone && isSkipped(progress, unit.id) && ` · ${t("Skipped")}`}
                          </span>
                        </span>
                        <span aria-hidden="true" className="muted text-2xl font-black">
                          ›
                        </span>
                      </Go>
                    </li>
                  );
                })}
                {!part &&
                  section.exams.map((exam) => (
                    <li key={exam.id}>
                      <ExamCard
                        exam={exam}
                        progress={progress}
                        isNext={next?.type === "exam" && next.exam.id === exam.id}
                        t={t}
                      />
                    </li>
                  ))}
              </ol>
            </details>
          </section>
        );
      })}
      {UNITS.length === 0 && <p className="card text-center font-bold">{t("No lessons yet.")}</p>}

      <TabBar active="/learn" />
    </main>
  );
}
