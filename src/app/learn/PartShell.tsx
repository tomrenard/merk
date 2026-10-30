"use client";

import { type ReactNode, useState } from "react";
import type { PartKind } from "@/lib/course";
import { useT } from "../Locale";
import { Go } from "../Nav";
import { queue } from "../outbox";
import { SoundToggle } from "../review/German";

/** Top bar and progress of a lesson part: ✕ back to the unit, progress, sound switch. */
export function PartShell({
  unitId,
  progress,
  children,
}: {
  unitId: string;
  progress: number;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <main className="screen">
      <header className="topbar">
        <Go
          href={`/learn/${unitId}`}
          className="muted text-2xl font-black"
          aria-label={t("Back to the unit")}
        >
          ✕
        </Go>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <SoundToggle />
      </header>
      {children}
    </main>
  );
}

/** The end screen of a part: result, then the next part or done. */
export function PartDone({
  title,
  detail,
  next,
}: {
  title: string;
  detail: string;
  next: { href: string; label: string } | null;
}) {
  const t = useT();
  return (
    <main className="screen justify-center text-center">
      <span aria-hidden="true" className="icon mx-auto size-24 bg-[var(--brand-soft)] text-6xl">
        🎉
      </span>
      <p className="text-3xl font-black">{title}</p>
      <p className="muted font-semibold">{detail}</p>
      {next && (
        <Go href={next.href} className="btn btn-primary">
          {next.label}
        </Go>
      )}
      <Go href="/" className="btn">
        {t("Done for today")}
      </Go>
    </main>
  );
}

/**
 * Saves a finished part: kept on the phone and sent when there is a connection (outbox), so it
 * works offline. `finished` turns true at once, so the part can't be submitted twice.
 */
export function usePartSave(unitId: string, kind: PartKind) {
  const [finished, setFinished] = useState(false);
  function save(score: number, total: number) {
    setFinished(true);
    queue({ type: "part", unitId, kind, score, total });
  }
  return { finished, save };
}
