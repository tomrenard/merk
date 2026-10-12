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
  const [word, plural] = splitPlural(de);
  return (
    <span className={`${articleColor(de)} ${className}`}>
      {word}
      {plural && <span className="text-[0.6em] opacity-70">{plural}</span>}
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
