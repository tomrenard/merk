"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  afterProbe,
  bandScores,
  type Level,
  type MeaningCheck,
  PSEUDOWORDS,
  type Search,
  startLesson,
  startSearch,
  type VocabAnswer,
  vocabResult,
} from "@/lib/placement";
import { shuffled } from "@/lib/shuffle";
import { useT } from "../Locale";
import { Exercise } from "../learn/Exercise";
import { Go } from "../Nav";
import { speak, useSpeechUnlock } from "../review/German";
import { applyPlacement } from "./actions";
import type { Packet, VocabWord } from "./data";

type Step = "intro" | "self" | "vocab" | "grammar" | "listen" | "result";
type Card = { word: VocabWord } | { pseudo: string };

const CAN_DO: { level: Level; text: string }[] = [
  { level: "A1", text: "I can introduce myself, order in a café and ask simple questions." },
  { level: "A2", text: "I can talk about my day, my last weekend and my plans." },
  { level: "B1", text: "I can handle most everyday situations, tell a story and give my opinion." },
  { level: "B2", text: "I can follow the news, discuss pros and cons and write a formal letter." },
];
const ORDER: Level[] = ["A1", "A2", "B1", "B2"];

/** About 10 minutes: words (yes/no, with made-up words mixed in), grammar, then listening. */
export function Placement({ packet }: { packet: Packet }) {
  useSpeechUnlock();
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [ticked, setTicked] = useState<Level[]>([]);
  const prior: Level = [...ORDER].reverse().find((level) => ticked.includes(level)) ?? "A1";
  // Made-up words in one random order: round 1 takes 15, round 2 the next 5.
  const [pseudo] = useState(() => shuffled(PSEUDOWORDS));
  // Vocabulary: two rounds of cards; every 3rd real "yes" gets a meaning check.
  const [cards, setCards] = useState<Card[]>(() => firstRound(packet, pseudo));
  const [round, setRound] = useState(1);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<VocabAnswer[]>([]);
  const [checks, setChecks] = useState<MeaningCheck[]>([]);
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [yesCount, setYesCount] = useState(0);
  const [checking, setChecking] = useState<VocabWord | null>(null);
  // Grammar: binary search over the units, 3 items per probe.
  const [search, setSearch] = useState<Search>(() => startSearch(packet.units.length, "A1"));
  const [probeItem, setProbeItem] = useState(0);
  const [probeRight, setProbeRight] = useState(0);
  // Listening: 3 lines per level, stop at the first level under 2/3.
  const [listenLevel, setListenLevel] = useState(0);
  const [listenItem, setListenItem] = useState(0);
  const [listenRight, setListenRight] = useState(0);
  const [listenPassed, setListenPassed] = useState(-1);
  const [picked, setPicked] = useState<number | null>(null);
  // Result choices.
  const [startUnit, setStartUnit] = useState(0);
  const [markWords, setMarkWords] = useState(true);
  const [saving, startSaving] = useTransition();
  const [failed, setFailed] = useState(false);

  const scores = bandScores(packet.bands, answers, checks);
  const vocab = vocabResult(scores);
  const levelOf = (unit: number) => packet.units[unit - 1]?.cefr ?? "A1";

  function answerCard(yes: boolean) {
    const card = cards[index];
    if (!card) return;
    const all = [...answers, { band: "word" in card ? card.word.band : null, yes }];
    setAnswers(all);
    if ("word" in card && yes) {
      const count = yesCount + 1;
      setYesCount(count);
      if (count % 3 === 0) return setChecking(card.word);
    }
    nextCard(all, checks);
  }

  function answerMeaning(choice: number) {
    if (!checking) return;
    const right = choice === checking.answer;
    const level = packet.bands[checking.band]?.level ?? "A1";
    const all = [...checks, { level, right }];
    setChecks(all);
    if (right) setConfirmed((c) => [...c, checking.noteId]);
    setChecking(null);
    nextCard(answers, all);
  }

  function nextCard(allAnswers: VocabAnswer[], allChecks: MeaningCheck[]) {
    if (index + 1 < cards.length) return setIndex(index + 1);
    if (round === 1) {
      setCards(secondRound(packet, bandScores(packet.bands, allAnswers, allChecks), pseudo));
      setRound(2);
      setIndex(0);
      return;
    }
    // Grammar starts at the lower of the self-assessment and one level above the words.
    const secure = vocabResult(bandScores(packet.bands, allAnswers, allChecks)).levels.filter(
      (l) => l.state === "secure",
    ).length;
    const fromWords: Level = ORDER[Math.min(secure, 3)] ?? "A1";
    const start = ORDER.indexOf(prior) <= ORDER.indexOf(fromWords) ? prior : fromWords;
    setSearch(startSearch(packet.units.length, start));
    setStep("grammar");
  }

  function probeDone(right: boolean) {
    const total = probeRight + (right ? 1 : 0);
    if (probeItem + 1 < 3) {
      setProbeRight(total);
      return setProbeItem(probeItem + 1);
    }
    const next = afterProbe(search, total >= 2);
    setSearch(next);
    setProbeItem(0);
    setProbeRight(0);
    if (next.done) {
      const last = packet.course.at(-1)?.lessons.at(-1)?.index ?? 0;
      setStartUnit(startLesson(packet.grammarAt, next.lo, last));
      setStep(packet.listening[0]?.length ? "listen" : "result");
    }
  }

  function listenDone(right: boolean) {
    const total = listenRight + (right ? 1 : 0);
    setPicked(null);
    if (listenItem + 1 < 3) {
      setListenRight(total);
      return setListenItem(listenItem + 1);
    }
    setListenItem(0);
    setListenRight(0);
    if (total >= 2) {
      setListenPassed(listenLevel);
      if (packet.listening[listenLevel + 1]?.length) return setListenLevel(listenLevel + 1);
    }
    setStep("result");
  }

  function apply() {
    setFailed(false);
    startSaving(async () => {
      try {
        const result = await applyPlacement({
          startUnit,
          markWords: markWords && !vocab.unreliable,
          knownBands: vocab.knownBands,
          confirmedWords: confirmed,
          summary: JSON.stringify({
            prior,
            vocab,
            grammar: search,
            listening: listenPassed,
            startUnit,
          }),
        });
        if (!result.ok) {
          setFailed(true);
          return;
        }
        router.push("/");
      } catch {
        setFailed(true);
      }
    });
  }

  const progress = {
    intro: 0,
    self: 0.05,
    vocab: 0.1 + 0.4 * ((round - 1) / 2 + index / cards.length / 2),
    grammar: 0.55 + 0.05 * search.probes,
    listen: 0.9,
    result: 1,
  }[step];
  const bar = (
    <div className="topbar">
      <Go href="/" className="muted text-2xl font-black" aria-label={t("Stop the test")}>
        ✕
      </Go>
      <div className="h-4 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-300"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );

  if (step === "intro") {
    return (
      <main className="screen justify-center gap-4 text-center">
        <span aria-hidden="true" className="icon mx-auto size-24 bg-[var(--brand-soft)] text-6xl">
          🧭
        </span>
        <h1 className="text-3xl font-black">{t("Find your level")}</h1>
        <p className="font-semibold">
          {t("About 10 minutes: words, then grammar, then a little listening.")}
        </p>
        <p className="muted font-semibold">
          {t(
            "Not knowing is fine: say No rather than guess. Some words are made up, to catch guessing.",
          )}
        </p>
        <button type="button" onClick={() => setStep("self")} className="btn btn-primary">
          {t("Start")}
        </button>
        <Go href="/" className="btn">
          {t("Not now")}
        </Go>
      </main>
    );
  }

  if (step === "self") {
    return (
      <main className="screen">
        {bar}
        <h1 className="text-2xl font-black">{t("What can you already do in German?")}</h1>
        <p className="muted font-semibold">{t("Tick everything that is true.")}</p>
        {CAN_DO.map(({ level, text }) => {
          const on = ticked.includes(level);
          return (
            <button
              key={level}
              type="button"
              aria-pressed={on}
              onClick={() => setTicked(on ? ticked.filter((l) => l !== level) : [...ticked, level])}
              className={`card text-left font-bold ${on ? "border-[var(--brand)] bg-[var(--brand-soft)]" : ""}`}
            >
              {on ? "☑️" : "⬜️"} {t(text)}
            </button>
          );
        })}
        <button type="button" onClick={() => setStep("vocab")} className="btn btn-primary mt-auto">
          {t("Continue")}
        </button>
      </main>
    );
  }

  if (step === "vocab") {
    const card = cards[index];
    if (checking) {
      return (
        <main className="screen">
          {bar}
          <p className="muted text-sm font-extrabold">{t("Quick check: what does it mean?")}</p>
          <p className="text-3xl font-black">{checking.de}</p>
          <div className="flex flex-col gap-2">
            {checking.options.map((option, i) => (
              <button
                key={option}
                type="button"
                onClick={() => answerMeaning(i)}
                className="btn justify-start normal-case"
              >
                {option}
              </button>
            ))}
            <button type="button" onClick={() => answerMeaning(-1)} className="btn normal-case">
              {t("I'm not sure after all")}
            </button>
          </div>
        </main>
      );
    }
    return (
      <main className="screen">
        {bar}
        <p className="muted text-sm font-extrabold">{t("Do you know what it means?")}</p>
        <p className="py-10 text-center text-4xl font-black">
          {card ? ("word" in card ? card.word.de : card.pseudo) : ""}
        </p>
        <div className="mt-auto grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => answerCard(false)}
            className="btn btn-solid py-5 text-lg [--c:#d63c3c]"
          >
            {t("No")}
          </button>
          <button
            type="button"
            onClick={() => answerCard(true)}
            className="btn btn-solid py-5 text-lg [--c:#1a7a43]"
          >
            {t("Yes")}
          </button>
        </div>
      </main>
    );
  }

  if (step === "grammar") {
    const item = packet.grammar[search.next - 1]?.[probeItem];
    return (
      <main className="screen">
        {bar}
        <p className="chip self-start bg-[var(--brand-soft)] text-[var(--brand)]">
          {t("Grammar")} · {levelOf(search.next)}
        </p>
        {item && <Exercise key={`${search.probes}-${probeItem}`} item={item} onDone={probeDone} />}
      </main>
    );
  }

  if (step === "listen") {
    const item = packet.listening[listenLevel]?.[listenItem];
    if (!item) return null;
    return (
      <main className="screen">
        {bar}
        <p className="muted text-sm font-extrabold">
          {t("Listening")} · {ORDER[listenLevel]} · {listenItem + 1}/3
        </p>
        <button
          type="button"
          onClick={() => speak(item.de, { recorded: true })}
          className="btn btn-primary py-5 text-xl"
        >
          🔊 {t("Play")}
        </button>
        <p className="font-bold">{t("What did you hear?")}</p>
        <div className="flex flex-col gap-2">
          {item.options.map((option, i) => (
            <button
              key={option}
              type="button"
              disabled={picked !== null}
              onClick={() => setPicked(i)}
              className={`btn justify-start normal-case ${picked === i ? "border-[var(--brand)] bg-[var(--brand-soft)]" : ""}`}
            >
              {option}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={picked === null}
          onClick={() => listenDone(picked === item.answer)}
          className="btn btn-primary mt-auto disabled:opacity-50"
        >
          {t("Continue")}
        </button>
        <button type="button" onClick={() => setStep("result")} className="btn">
          {t("Skip listening")}
        </button>
      </main>
    );
  }

  const markCount =
    vocab.knownBands.reduce((sum, id) => sum + (packet.bands[id]?.size ?? 0), 0) + confirmed.length;
  const grammarLevel = search.lo ? levelOf(search.lo) : t("beginner");
  return (
    <main className="screen">
      <h1 className="text-3xl font-black">{t("Your level")}</h1>
      <section className="card flex flex-col gap-2">
        <p className="font-extrabold">📚 {t("Words")}</p>
        {vocab.unreliable ? (
          <p className="font-semibold">
            {t(
              "Too many made-up words got a Yes, so this part can't be trusted. Nothing will be marked.",
            )}
          </p>
        ) : (
          <>
            <p className="font-semibold">
              {t("About {n} words ({low}–{high})", {
                n: vocab.size,
                low: vocab.low,
                high: vocab.high,
              })}
            </p>
            <p className="muted text-sm font-semibold">
              {vocab.levels.map((l) => `${l.level}: ${t(l.state)}`).join(" · ")}
            </p>
          </>
        )}
      </section>
      <section className="card flex flex-col gap-2">
        <p className="font-extrabold">🧩 {t("Grammar")}</p>
        <p className="font-semibold">
          {search.lo
            ? t("{level}: you know the grammar up to about “{title}”.", {
                level: grammarLevel,
                title: packet.units[search.lo - 1]?.title ?? "",
              })
            : t("Start from the beginning.")}
        </p>
      </section>
      <section className="card flex flex-col gap-2">
        <p className="font-extrabold">🎧 {t("Listening")}</p>
        <p className="font-semibold">
          {listenPassed >= 0
            ? t("{level} understood", { level: ORDER[listenPassed] ?? "" })
            : t("Start at A1")}
        </p>
      </section>
      <label className="flex flex-col gap-1">
        <span className="muted text-sm font-bold">{t("Start the course at")}</span>
        <select
          value={startUnit}
          onChange={(event) => setStartUnit(Number(event.target.value))}
          className="field"
        >
          {packet.course.map((part) => (
            <optgroup key={part.id} label={part.id}>
              {part.lessons.map((lesson) => (
                <option key={lesson.index} value={lesson.index}>
                  {part.id} · {lesson.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="muted text-sm">
          {t(
            "Lessons and exams before it count as done; each lesson still comes back once in your reviews.",
          )}
        </span>
      </label>
      {!vocab.unreliable && markCount > 0 && (
        <label className="card flex items-center gap-3 font-semibold">
          <input
            type="checkbox"
            checked={markWords}
            onChange={(event) => setMarkWords(event.target.checked)}
            className="size-5"
          />
          {t("Mark {n} words as known. They come back for a quick check over the next 2 months.", {
            n: markCount,
          })}
        </label>
      )}
      {failed && (
        <p className="font-semibold text-rose-600 dark:text-rose-400">
          {t(
            "Couldn't save. A placement saved in the last 10 minutes blocks a new one; otherwise try again.",
          )}
        </p>
      )}
      <button type="button" disabled={saving} onClick={apply} className="btn btn-primary">
        {saving ? t("Saving…") : t("Start learning")}
      </button>
    </main>
  );
}

/** Round 1: 4 words from every band plus 15 made-up words, mixed. */
function firstRound(packet: Packet, made: string[]): Card[] {
  const words = packet.vocab.flatMap((band) => band.slice(0, 4)).map((word) => ({ word }));
  return shuffled<Card>([...words, ...made.slice(0, 15).map((p) => ({ pseudo: p }))]);
}

/** Round 2: 6 more words from the 2 bands closest to 70% known (where the estimate is least sure). */
function secondRound(
  packet: Packet,
  scores: ReturnType<typeof bandScores>,
  made: string[],
): Card[] {
  const unsure = [...scores].sort((a, b) => Math.abs(a.p - 0.7) - Math.abs(b.p - 0.7)).slice(0, 2);
  const words = unsure
    .flatMap((s) => packet.vocab[s.id]?.slice(4, 10) ?? [])
    .map((word) => ({ word }));
  return shuffled<Card>([...words, ...made.slice(15, 20).map((p) => ({ pseudo: p }))]);
}
