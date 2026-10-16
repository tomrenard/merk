"use client";

import { useEffect, useState } from "react";
import { useT } from "../Locale";
import { germanVoices, setVoice, speak, storedVoice } from "../review/German";

/** Pick the German voice; the list fills in once the device has loaded its voices. */
export function VoicePicker() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [current, setCurrent] = useState("");
  const t = useT();
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => {
      const list = germanVoices();
      setVoices(list);
      setCurrent(storedVoice() ?? list[0]?.voiceURI ?? "");
    };
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  return (
    <div className="card flex flex-col gap-2">
      <span className="muted text-sm font-semibold">{t("Voice")}</span>
      <div className="flex gap-2">
        <select
          value={current}
          onChange={(event) => {
            setCurrent(event.target.value);
            setVoice(event.target.value);
          }}
          className="field min-w-0 flex-1"
          aria-label={t("German voice")}
        >
          {voices.length === 0 && <option value="">{t("Default")}</option>}
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
          {t("Test")}
        </button>
      </div>
      <span className="muted text-sm">
        {t(
          "Sounds robotic? On iPhone: Settings › Accessibility › Spoken Content › Voices › German, and download a voice marked Premium or Enhanced. It then shows up here.",
        )}
      </span>
    </div>
  );
}
