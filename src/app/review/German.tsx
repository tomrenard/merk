"use client";

import { useEffect, useState } from "react";
import { articleColor, splitPlural, spokenForm } from "@/lib/german";

const MUTED = "merk-muted";

function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTED) === "1";
  } catch {
    return false;
  }
}

export function speak(text: string) {
  if (!("speechSynthesis" in window) || isMuted()) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  speechSynthesis.speak(utterance);
}

/** 🔊/🔇 switch for the voice, remembered on this device. */
export function SoundToggle() {
  const [muted, setMuted] = useState(false);
  useEffect(() => setMuted(isMuted()), []);
  function toggle() {
    const next = !muted;
    setMuted(next);
    try {
      localStorage.setItem(MUTED, next ? "1" : "0");
    } catch {}
    if (next && "speechSynthesis" in window) speechSynthesis.cancel();
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className="chip line border-2 text-base"
      aria-label={muted ? "Unmute" : "Mute"}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
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
      className="text-4xl font-black tracking-tight"
      title="Listen"
    >
      <Headword de={word} />{" "}
      <span aria-hidden="true" className="text-xl opacity-50">
        🔊
      </span>
    </button>
  );
}
