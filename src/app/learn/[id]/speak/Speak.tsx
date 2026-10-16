"use client";

import { useEffect, useState } from "react";
import type { Failure } from "@/lib/ai";
import { withOthers } from "@/lib/choices";
import { CHEERS, courseOfId } from "@/lib/courses";
import { spokenWords } from "@/lib/german";
import type { Unit } from "@/lib/units";
import { transcribeRecording } from "../../../ai/actions";
import { AiFailure } from "../../../ai/Feedback";
import { recordingForm, useRecorder } from "../../../ai/useRecorder";
import { PANEL } from "../../../feedback";
import { useQuiet, useT } from "../../../Locale";
import { speak, useSpeechUnlock } from "../../../review/German";
import { Say } from "../../../Say";
import { PartDone, PartShell, usePartSave } from "../../PartShell";
import { Pick } from "../../Pick";

/**
 * Repeat each line: hear it, record yourself (it stops by itself after about the line's length),
 * then see which words came through (speech-to-text on the server, no AI teacher needed) and
 * play yourself back.
 */
export function Speak({
  unit,
  after,
}: {
  unit: Unit;
  after: { href: string; label: string } | null;
}) {
  useSpeechUnlock();
  const t = useT();
  const course = courseOfId(unit.id);
  // Darija has no fixed spelling, so a transcript can't be matched word by word: you compare.
  const matchWords = course === "de";
  const lines = unit.speaking;
  const [index, setIndex] = useState(0);
  const [heard, setHeard] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [listening, setListening] = useState(false);
  const quiet = useQuiet();
  // Quiet mode: no recording; you hear the line and pick what it means.
  const [meaning, setMeaning] = useState<number | null>(null);
  const line = lines[index];
  // Enough time for the line said slowly, then it stops and checks by itself.
  const seconds = Math.min(20, 3 + Math.ceil((line?.de.split(" ").length ?? 5) * 0.7));
  const { recording, clip, error, start, stop, reset } = useRecorder(seconds);
  const { finished, failed, saving, save, retry } = usePartSave(unit.id, "speak");

  // Each new recording is written down once.
  useEffect(() => {
    if (!clip) return;
    let current = true;
    setHeard(null);
    setFailure(null);
    setListening(true);
    transcribeRecording(recordingForm(clip.blob, { course }))
      .catch((): Failure => ({ ok: false, reason: "error" }))
      .then((result) => {
        if (!current) return;
        setListening(false);
        if (result.ok) setHeard(result.result);
        else setFailure(result);
      });
    return () => {
      current = false;
    };
  }, [clip, course]);

  function next() {
    reset();
    setHeard(null);
    setFailure(null);
    setMeaning(null);
    if (index + 1 < lines.length) setIndex(index + 1);
    else save(lines.length, lines.length);
  }

  if (finished || !line) {
    return (
      <PartDone
        next={after}
        title={CHEERS[course].spoke}
        detail={t("Saying it out loud is what makes it come out in real conversations.")}
        saveFailed={failed}
        onRetry={retry}
        saving={saving}
      />
    );
  }

  // Which words of the line didn't come through (order, fillers and repeats don't matter).
  const said = new Set(spokenWords(heard ?? ""));
  const shown = line.de.split(" ").map((word) => ({
    word,
    missed: spokenWords(word).some((w) => !said.has(w)),
  }));
  const missed = shown.filter((w) => w.missed).map((w) => w.word.replace(/[.,!?;:]/g, ""));

  if (quiet) {
    const meanings = withOthers(
      { de: line.en },
      lines.map((l) => ({ de: l.en })),
      `${unit.id}:speak:${index}`,
      { others: 2 },
    );
    const right = meaning === meanings.answer;
    return (
      <PartShell unitId={unit.id} progress={index / lines.length}>
        <p className="muted text-sm font-extrabold">
          {t("Listen {n}/{total}: what does it mean?", { n: index + 1, total: lines.length })}
        </p>
        <div className="card">
          <Say de={line.de} tr={line.tr} className="text-2xl font-black" />
        </div>
        <button type="button" onClick={() => speak(line.de, { recorded: true })} className="btn">
          🔊 {t("Listen")}
        </button>
        <Pick
          options={meanings.options}
          picked={meaning}
          onPick={setMeaning}
          checked={meaning !== null}
        />
        {meaning !== null && (
          <p className={`rounded-2xl p-4 text-xl font-black ${PANEL[right ? "right" : "wrong"]}`}>
            {right ? `✓ ${CHEERS[course].right}` : `✗ ${line.en}`}
          </p>
        )}
        <button
          type="button"
          disabled={meaning === null}
          onClick={next}
          className="btn btn-primary mt-auto disabled:opacity-50"
        >
          {index + 1 < lines.length ? t("Next line") : t("Finish")}
        </button>
      </PartShell>
    );
  }

  return (
    <PartShell unitId={unit.id} progress={index / lines.length}>
      <p className="muted text-sm font-extrabold">
        {t("Say it {n}/{total}: listen, then repeat", { n: index + 1, total: lines.length })}
      </p>
      <div className="card flex flex-col gap-2">
        <Say de={line.de} tr={line.tr} className="text-2xl font-black" />
        <p className="muted font-semibold">{line.en}</p>
      </div>
      <button type="button" onClick={() => speak(line.de, { recorded: true })} className="btn">
        🔊 {t("Listen")}
      </button>
      <button
        type="button"
        onClick={recording ? stop : start}
        className={`btn btn-solid py-5 text-lg ${recording ? "[--c:#d63c3c]" : "[--c:var(--brand-fill)]"}`}
      >
        {recording ? `⏹ ${t("Done")}` : clip ? `🎙 ${t("Try again")}` : `🎙 ${t("Say it")}`}
      </button>
      <p className="muted text-sm">
        {recording
          ? t("Say the sentence now. It stops by itself after {n} seconds.", { n: seconds })
          : matchWords
            ? t("Tap, say the sentence, and we check which words came through.")
            : t("Tap, say the sentence, then compare what we heard with it.")}
      </p>
      {error && <p className="font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
      {listening && (
        <p role="status" className="muted font-semibold">
          {t("Checking what you said…")}
        </p>
      )}
      {heard !== null && !matchWords && (
        <div role="status" className="card flex flex-col gap-2">
          <p className="muted text-sm">{t("We heard:")}</p>
          <p className="text-lg font-semibold" dir="rtl" lang="ar-MA">
            {heard || "…"}
          </p>
        </div>
      )}
      {heard !== null && matchWords && (
        <div role="status" className="card flex flex-col gap-2">
          <p className="font-extrabold">
            {missed.length
              ? t("Didn't come through: {words}", { words: missed.join(", ") })
              : `✓ ${t("Perfect, every word came through.")}`}
          </p>
          <p className="text-lg font-semibold" lang="de">
            {shown.map(({ word, missed }, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: words of a fixed sentence
              <span key={i} className={missed ? "text-rose-600 underline dark:text-rose-400" : ""}>
                {word}{" "}
              </span>
            ))}
          </p>
          <p className="muted text-sm">
            {t("We heard:")} „{heard || "…"}“
          </p>
        </div>
      )}
      {clip && !recording && (
        <button type="button" onClick={() => new Audio(clip.url).play()} className="btn">
          ▶ {t("Hear yourself")}
        </button>
      )}
      {failure && <AiFailure failure={failure} />}
      {clip && (
        <p className="muted text-xs">
          {t(
            "Your recording is sent once for speech-to-text and not stored; only the text is kept.",
          )}
        </p>
      )}
      <button type="button" onClick={next} className="btn mt-auto">
        {index + 1 < lines.length ? t("Next line") : t("Finish")}
      </button>
    </PartShell>
  );
}
