"use client";

import { articleColor, spokenForm } from "@/lib/german";

export function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  speechSynthesis.speak(utterance);
}

export function German({ word }: { word: string }) {
  return (
    <button
      type="button"
      onClick={() => speak(spokenForm(word))}
      className={`text-3xl font-semibold ${articleColor(word)}`}
      title="Listen"
    >
      {word}{" "}
      <span aria-hidden="true" className="text-xl opacity-50">
        🔊
      </span>
    </button>
  );
}
