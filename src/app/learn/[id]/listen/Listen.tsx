"use client";

import { useEffect, useRef, useState } from "react";
import { tileItem, tilePool, withOthers } from "@/lib/choices";
import { CHEERS, courseOfId } from "@/lib/courses";
import { sameDarija } from "@/lib/darija";
import { sameAnswer } from "@/lib/german";
import { shuffled } from "@/lib/shuffle";
import type { Unit } from "@/lib/units";
import { PANEL, SOLID } from "../../../feedback";
import { useQuiet, useT } from "../../../Locale";
import { speak, stopSpeaking, useSpeechUnlock } from "../../../review/German";
import { Say } from "../../../Say";
import { Exercise } from "../../Exercise";
import { PartDone, PartShell, usePartSave } from "../../PartShell";
import { Pick } from "../../Pick";

type Step = "hear" | "questions" | "read" | "dictation";

/** Hear the dialogue (text hidden), answer questions, read it, then type sentences you hear. */
export function Listen({
  unit,
  after,
}: {
  unit: Unit;
  after: { href: string; label: string } | null;
}) {
  const t = useT();
  const cheer = CHEERS[courseOfId(unit.id)];
  const quiet = useQuiet();

  useSpeechUnlock();
  const { lines, questions } = unit.listening;
  const [step, setStep] = useState<Step>("hear");
  const [playing, setPlaying] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [right, setRight] = useState(0);
  const [answer, setAnswer] = useState<number | string | null>(null);
  const [checked, setChecked] = useState(false);
  const [english, setEnglish] = useState(false);
  const [options] = useState(() =>
    questions.map((q) => shuffled(q.options.map((option, i) => ({ option, i })))),
  );
  const { finished, failed, saving, save, retry } = usePartSave(unit.id, "listen");
  const total = questions.length + unit.dictation.length;
  // The other speaker gets the second voice, if the device has one.
  const speakers = [...new Set(lines.map((line) => line.speaker))];

  // Each playback has an id: a newer one, another sound or leaving the screen stops the chain.
  const run = useRef(0);
  useEffect(
    () => () => {
      run.current++;
      stopSpeaking();
    },
    [],
  );

  function play(from = 0, id = ++run.current) {
    const line = lines[from];
    if (!line || id !== run.current) return setPlaying(null);
    setPlaying(from);
    speak(line.de, {
      recorded: true,
      second: speakers.indexOf(line.speaker) % 2 === 1,
      onEnd: () => {
        if (id === run.current) play(from + 1, id);
      },
    });
  }

  function stop() {
    run.current++;
    setPlaying(null);
    stopSpeaking();
  }

  /** A single line or sentence; stops the dialogue first. */
  function say(text: string, second = false) {
    run.current++;
    setPlaying(null);
    speak(text, { second, recorded: true });
  }

  function next(correct: boolean, count: number) {
    const score = right + (correct ? 1 : 0);
    setRight(score);
    setAnswer(null);
    setChecked(false);
    if (index + 1 < count) return setIndex(index + 1);
    setIndex(0);
    if (step === "questions") setStep("read");
    else save(score, total);
  }

  if (finished) {
    return (
      <PartDone
        next={after}
        title={cheer.heard}
        detail={t("{right}/{total} right. Try the dialogue again any time.", { right, total })}
        saveFailed={failed}
        onRetry={retry}
        saving={saving}
      />
    );
  }

  const progress = { hear: 0, questions: 0.25, read: 0.5, dictation: 0.75 }[step];

  if (step === "hear") {
    return (
      <PartShell unitId={unit.id} progress={progress}>
        <p className="muted text-sm font-extrabold">{t("Listen first, no text")}</p>
        <h1 className="text-2xl font-black">{unit.listening.title}</h1>
        <p className="font-semibold">{unit.listening.intro}</p>
        <button
          type="button"
          onClick={() => (playing === null ? play() : stop())}
          className="btn btn-primary py-5 text-xl"
        >
          {playing === null
            ? `▶ ${t("Play the dialogue")}`
            : `⏹ ${t("Line {n}/{total}", { n: playing + 1, total: lines.length })}`}
        </button>
        <p className="muted text-sm">
          {t("Listen twice if you like. Then answer a few questions.")}
        </p>
        <button
          type="button"
          onClick={() => {
            stop();
            setStep("questions");
          }}
          className="btn mt-auto"
        >
          {t("Questions")}
        </button>
      </PartShell>
    );
  }

  if (step === "questions") {
    const question = questions[index];
    if (!question) return null;
    const correct = answer === question.answer;
    return (
      <PartShell unitId={unit.id} progress={progress + (index / questions.length) * 0.25}>
        <p className="muted text-sm font-extrabold">
          {t("Question {n}/{total}", { n: index + 1, total: questions.length })}
        </p>
        <p className="text-2xl font-black">{question.q}</p>
        <div className="flex flex-col gap-2">
          {options[index]?.map(({ option, i }) => (
            <button
              key={option}
              type="button"
              disabled={checked}
              onClick={() => setAnswer(i)}
              className={`btn justify-start text-left normal-case ${answer === i ? "border-[var(--brand)] bg-[var(--brand-soft)]" : ""}`}
            >
              {option}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => (playing === null ? play() : stop())} className="btn">
          {playing === null ? `🔊 ${t("Hear it again")}` : `⏹ ${t("Stop")}`}
        </button>
        {checked && (
          <p className={`rounded-2xl p-4 text-xl font-black ${PANEL[correct ? "right" : "wrong"]}`}>
            {correct ? `✓ ${cheer.right}` : `✗ ${question.options[question.answer]}`}
          </p>
        )}
        <button
          type="button"
          disabled={answer === null}
          onClick={() => (checked ? next(correct, questions.length) : setChecked(true))}
          className={`btn btn-solid mt-auto disabled:opacity-50 ${SOLID[checked ? (correct ? "right" : "wrong") : "idle"]}`}
        >
          {checked ? t("Continue") : t("Check")}
        </button>
      </PartShell>
    );
  }

  if (step === "read") {
    return (
      <PartShell unitId={unit.id} progress={progress}>
        <div className="topbar">
          <p className="muted text-sm font-extrabold">{t("Now read it · tap a line")}</p>
          <button type="button" onClick={() => setEnglish(!english)} className="chip line border">
            {english ? t("Hide translation") : t("Show translation")}
          </button>
        </div>
        <ol className="card flex flex-col gap-3">
          {lines.map((line) => (
            <li key={`${line.speaker}: ${line.de}`}>
              <button
                type="button"
                onClick={() => say(line.de, speakers.indexOf(line.speaker) % 2 === 1)}
                className="text-left"
              >
                <span className="muted block text-xs font-extrabold">{line.speaker}</span>
                <Say de={line.de} tr={line.tr} className="font-bold" />
                {english && <span className="muted block text-sm">{line.en}</span>}
              </button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setStep("dictation")} className="btn btn-primary">
          {t("Dictation")}
        </button>
      </PartShell>
    );
  }

  const sentence = unit.dictation[index] ?? "";
  // Darija: heard in Arabic, typed and checked in Latin.
  const sentenceTr = unit.dictationTr?.[index];
  const typed = typeof answer === "string" ? answer : "";
  const n = { n: index + 1, total: unit.dictation.length };
  const progressNow = progress + (index / unit.dictation.length) * 0.25;
  // Quiet mode: build the sentence you hear from its words, with no text to read.
  const tiles = quiet
    ? tileItem(`${unit.id}:dictation:${index}`, sentenceTr ?? sentence, {
        en: "",
        de: sentenceTr ? sentence : undefined,
        pool: tilePool(unit),
      })
    : null;
  if (tiles) {
    return (
      <PartShell unitId={unit.id} progress={progressNow}>
        <p className="muted text-sm font-extrabold">
          {t("Dictation {n}/{total}: build what you hear", n)}
        </p>
        <button type="button" onClick={() => say(sentence)} className="btn self-start text-2xl">
          🔊 {t("Play")}
        </button>
        <Exercise
          key={tiles.id}
          item={tiles}
          onDone={(right) => next(right, unit.dictation.length)}
        />
      </PartShell>
    );
  }
  // Quiet mode, a sentence too short for tiles: pick it among the lesson's others.
  const choices = quiet
    ? withOthers(
        { de: sentence, tr: sentenceTr },
        [
          ...unit.dictation.map((de, i) => ({ de, tr: unit.dictationTr?.[i] })),
          ...unit.listening.lines,
        ],
        `${unit.id}:dictation:${index}`,
        { others: 2 },
      )
    : null;
  const correct = choices
    ? answer === choices.answer
    : sentenceTr
      ? sameDarija(typed, sentenceTr)
      : sameAnswer(typed, sentence);
  return (
    <PartShell unitId={unit.id} progress={progressNow}>
      <p className="muted text-sm font-extrabold">
        {t(
          choices
            ? "Dictation {n}/{total}: which sentence do you hear?"
            : "Dictation {n}/{total}: type what you hear",
          n,
        )}
      </p>
      <button type="button" onClick={() => say(sentence)} className="btn self-start text-2xl">
        🔊 {t("Play")}
      </button>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (checked) next(correct, unit.dictation.length);
          else if (choices ? answer !== null : typed.trim()) setChecked(true);
        }}
      >
        {choices ? (
          <Pick
            options={choices.options}
            picked={typeof answer === "number" ? answer : null}
            onPick={setAnswer}
            checked={checked}
          />
        ) : (
          <textarea
            value={typed}
            onChange={(event) => setAnswer(event.target.value)}
            readOnly={checked}
            rows={2}
            lang={sentenceTr ? "fr" : "de"}
            autoCapitalize={sentenceTr ? "off" : "sentences"}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label={t("What you heard")}
            className="field text-lg font-bold"
          />
        )}

        {checked && (
          <div className={`rounded-2xl p-4 ${PANEL[correct ? "right" : "wrong"]}`}>
            <p className="text-xl font-black">
              {correct ? `✓ ${cheer.right}` : `✗ ${t("It was:")}`}
            </p>
            <Say de={sentence} tr={sentenceTr} className="font-bold" />
          </div>
        )}
        <button
          type="submit"
          onMouseDown={(event) => event.preventDefault()}
          className={`btn btn-solid ${SOLID[checked ? (correct ? "right" : "wrong") : "idle"]}`}
        >
          {checked ? t("Continue") : t("Check")}
        </button>
      </form>
    </PartShell>
  );
}
