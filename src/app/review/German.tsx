"use client";

import { useEffect, useState } from "react";
import { audioUrl } from "@/lib/audio";
import { articleColor, splitPlural, spokenForm } from "@/lib/german";

const MUTED = "merk-muted";
const VOICE = "merk-voice";

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function isMuted(): boolean {
  return stored(MUTED) === "1";
}

/** Apple's novelty voices (Grandma, Rocko…) are listed as German too. */
const NOVELTY =
  /eddy|flo|reed|rocko|sandy|shelley|grandma|grandpa|bahh|bells|boing|bubbles|jester|organ|superstar|trinoids|whisper|wobble|zarvox|albert|bad news|good news|cellos/i;

/** German voices on this device, best first (Premium/Enhanced before the compact default). */
export function germanVoices(): SpeechSynthesisVoice[] {
  if (!("speechSynthesis" in window)) return [];
  const quality = (v: SpeechSynthesisVoice) =>
    /premium/i.test(v.name) ? 0 : /enhanced|erweitert/i.test(v.name) ? 1 : 2;
  return speechSynthesis
    .getVoices()
    .filter((v) => v.lang.replace("_", "-").startsWith("de") && !NOVELTY.test(v.name))
    .sort((a, b) => quality(a) - quality(b));
}

export function storedVoice(): string | null {
  return stored(VOICE);
}

export function setVoice(voiceURI: string) {
  try {
    localStorage.setItem(VOICE, voiceURI);
  } catch {}
}

/** One audio element for recorded sentences: iOS lets it play again once a tap has started it. */
let player: HTMLAudioElement | null = null;
const getPlayer = () => {
  player ??= new Audio();
  return player;
};
/** Bumped on every new sentence or stop, so late events of an old one are ignored. */
let turn = 0;

/** Stops whatever is being said, recorded or by the phone. */
export function stopSpeaking() {
  turn++;
  player?.pause();
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

function deviceSpeak(text: string, second: boolean, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  const voices = germanVoices();
  const mine = voices.find((v) => v.voiceURI === stored(VOICE)) ?? voices[0];
  const chosen = second ? (voices.find((v) => v !== mine) ?? mine) : mine;
  if (chosen) utterance.voice = chosen;
  if (onEnd) utterance.onend = () => onEnd();
  speechSynthesis.speak(utterance);
}

/**
 * Says `text` in German. `recorded` plays the recorded voice of a lesson or exam sentence
 * (falling back to the phone's voice when there is none); otherwise the phone speaks, with
 * `second` picking another voice for the other speaker of a dialogue. `onEnd` runs when it
 * finishes (or straight away when muted).
 */
export function speak(
  text: string,
  {
    second = false,
    recorded = false,
    onEnd,
  }: { second?: boolean; recorded?: boolean; onEnd?: () => void } = {},
) {
  stopSpeaking();
  if (isMuted()) {
    onEnd?.();
    return;
  }
  if (!recorded) return deviceSpeak(text, second, onEnd);
  const mine = turn;
  const audio = getPlayer();
  // A missing file both fires "error" and rejects play(): speak once, and only for this turn.
  const fallback = () => {
    if (mine !== turn) return;
    const now = ++turn;
    deviceSpeak(text, second, () => {
      if (now === turn) onEnd?.();
    });
  };
  audio.onended = () => {
    if (mine === turn) onEnd?.();
  };
  audio.onerror = fallback;
  audio.src = audioUrl(text);
  audio.play().catch(fallback);
}

/** A silent sound, played on the first tap so iOS allows later automatic playback. */
const SILENCE =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

/**
 * iOS only plays sound once a tap has started it; until then automatic speech is silent. The
 * first tap anywhere starts both the phone's voice and the recorded-audio player.
 */
export function useSpeechUnlock() {
  useEffect(() => {
    const unlock = () => {
      if ("speechSynthesis" in window) speechSynthesis.speak(new SpeechSynthesisUtterance(""));
      if (getPlayer().src) return;
      getPlayer().src = SILENCE;
      getPlayer()
        .play()
        .catch(() => {});
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);
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
    if (next) stopSpeaking();
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className="chip line border text-base"
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
