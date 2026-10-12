"use client";

import Link from "next/link";
import { type ReactNode, useState, useTransition } from "react";
import type { PartKind } from "@/lib/course";
import { SoundToggle } from "../review/German";
import { recordPart } from "./actions";

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
  return (
    <main className="screen">
      <header className="topbar">
        <Link
          href={`/learn/${unitId}`}
          className="muted text-2xl font-black"
          aria-label="Back to the unit"
        >
          ✕
        </Link>
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

/** The end screen of a part: result, a retry if saving failed, then the next part or done. */
export function PartDone({
  title,
  detail,
  saveFailed,
  onRetry,
  next,
  saving = false,
}: {
  title: string;
  detail: string;
  saveFailed: boolean;
  onRetry: () => void;
  saving?: boolean;
  next: { href: string; label: string } | null;
}) {
  return (
    <main className="screen justify-center text-center">
      <span aria-hidden="true" className="icon mx-auto size-24 bg-[var(--brand-soft)] text-6xl">
        🎉
      </span>
      <p className="text-3xl font-black">{title}</p>
      <p className="muted font-semibold">{detail}</p>
      {saveFailed ? (
        <button
          type="button"
          disabled={saving}
          onClick={onRetry}
          className="btn btn-primary disabled:opacity-50"
        >
          Couldn't save: retry
        </button>
      ) : (
        next && (
          <Link href={next.href} className="btn btn-primary">
            {next.label}
          </Link>
        )
      )}
      <Link href="/" className="btn">
        Done for today
      </Link>
    </main>
  );
}

/**
 * Saves a finished part. `finished` turns true the moment saving starts, so the part can't be
 * submitted twice; on failure (offline) the result is kept so the end screen can retry.
 */
export function usePartSave(unitId: string, kind: PartKind) {
  const [state, setState] = useState<"working" | "saving" | "saved" | "failed">("working");
  const [last, setLast] = useState<[number, number]>([0, 1]);
  const [, startSaving] = useTransition();
  function save(score: number, total: number) {
    setLast([score, total]);
    setState("saving");
    startSaving(async () => {
      try {
        await recordPart(unitId, kind, score, total);
        setState("saved");
      } catch {
        setState("failed");
      }
    });
  }
  return {
    finished: state !== "working",
    failed: state === "failed",
    saving: state === "saving",
    save,
    retry: () => save(...last),
  };
}
