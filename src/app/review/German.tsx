"use client";

import { articleColor, splitPlural, spokenForm } from "@/lib/german";

export function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  speechSynthesis.speak(utterance);
}

/** A headword with its plural note set smaller, in the word's gender colour. */
export function Headword({ de, className = "" }: { de: string; className?: string }) {
  return (
    <span className={`${articleColor(de)} ${className}`}>
      {splitPlural(de).map(({ text, plural }, i) =>
        plural ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: parts of a fixed string
          <span key={i} className="text-[0.6em] opacity-70">
            {text}
          </span>
        ) : (
          text
        ),
      )}
    </span>
  );
}

export function German({ word }: { word: string }) {
  return (
    <button
      type="button"
      onClick={() => speak(spokenForm(word))}
      className="text-4xl font-extrabold tracking-tight"
      title="Listen"
    >
      <Headword de={word} />{" "}
      <span aria-hidden="true" className="text-xl opacity-50">
        🔊
      </span>
    </button>
  );
}
