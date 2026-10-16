"use client";

import type { Choice } from "@/lib/choices";
import { Say } from "../Say";

/** Quiet mode: tappable options (both scripts for Darija); locked once `checked`. */
export function Pick({
  options,
  picked,
  onPick,
  checked,
}: {
  options: Choice[];
  picked: number | null;
  onPick: (index: number) => void;
  checked: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((option, i) => (
        <button
          key={option.de}
          type="button"
          disabled={checked}
          onClick={() => onPick(i)}
          aria-pressed={picked === i}
          className={`btn justify-start text-left normal-case ${picked === i ? "border-[var(--brand)] bg-[var(--brand-soft)]" : ""}`}
        >
          <Say de={option.de} tr={option.tr} />
        </button>
      ))}
    </div>
  );
}
