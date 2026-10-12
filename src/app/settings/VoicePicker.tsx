"use client";

import { useEffect, useState } from "react";
import { germanVoices, setVoice, speak } from "../review/German";

/** Pick the German voice; the list fills in once the device has loaded its voices. */
export function VoicePicker() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [current, setCurrent] = useState("");
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => {
      const list = germanVoices();
      setVoices(list);
      try {
        setCurrent(localStorage.getItem("merk-voice") ?? list[0]?.voiceURI ?? "");
      } catch {}
    };
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  return (
    <div className="card flex flex-col gap-2">
      <span className="muted text-sm font-semibold">Voice</span>
      <div className="flex gap-2">
        <select
          value={current}
          onChange={(event) => {
            setCurrent(event.target.value);
            setVoice(event.target.value);
          }}
          className="field min-w-0 flex-1"
          aria-label="German voice"
        >
          {voices.length === 0 && <option value="">Default</option>}
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => speak("Guten Tag! Wie geht es Ihnen?")}
          className="btn"
        >
          Test
        </button>
      </div>
      <span className="muted text-sm">
        Sounds robotic? On iPhone: Settings › Accessibility › Spoken Content › Voices › German, and
        download a voice marked Premium or Enhanced. It then shows up here.
      </span>
    </div>
  );
}
