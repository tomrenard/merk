"use client";

import { useEffect, useRef, useState } from "react";
import { dateLocale, translator } from "@/lib/i18n";
import type { WordRow } from "@/lib/words";
import { useLocale } from "../Locale";
import { Go } from "../Nav";
import { Headword } from "../review/German";
import { moreWords } from "./actions";

/** The word list: the first page from the server, then the next one each time you near the end. */
export function WordList({
  first,
  total,
  page,
  q,
  filter,
}: {
  first: WordRow[];
  total: number;
  /** Rows per page: a shorter page means the list has ended (it may shrink after `total`). */
  page: number;
  q: string;
  filter: string;
}) {
  const locale = useLocale();
  const t = translator(locale);
  const [words, setWords] = useState(first);
  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(first.length < page);
  const [failed, setFailed] = useState(false);
  const end = useRef<HTMLLIElement>(null);
  const more = !ended && words.length < total;

  function load() {
    setLoading(true);
    setFailed(false);
    moreWords(q, filter, words.length)
      .then((next) => {
        if (next.length < page) setEnded(true);
        // A word that moved between pages (reviewed meanwhile) is shown once.
        setWords((shown) => {
          const ids = new Set(shown.map((word) => word.id));
          return [...shown, ...next.filter((word) => !ids.has(word.id))];
        });
      })
      // Offline or server down: wait for a tap instead of retrying on every render.
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const target = end.current;
    if (!target || !more || loading || failed) return;
    const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting && load(), {
      rootMargin: "600px",
    });
    observer.observe(target);
    return () => observer.disconnect();
  });

  return (
    <ul className="card flex flex-col divide-y divide-[var(--line)] py-0">
      {words.map((word) => (
        <li key={word.id}>
          <Go
            href={`/words/${encodeURIComponent(word.id)}`}
            className="flex items-baseline justify-between gap-3 py-3"
          >
            <span>
              <Headword de={word.de} className="font-extrabold" />{" "}
              <span className="muted">{word.en}</span>
            </span>
            <span className="muted shrink-0 text-xs font-bold">
              {word.cefr} ·{" "}
              {word.due ? new Date(word.due).toLocaleDateString(dateLocale(locale)) : t("new")}
            </span>
          </Go>
        </li>
      ))}
      {more && (
        <li ref={end} className="muted py-3 text-center text-sm font-bold">
          {failed ? (
            <button type="button" onClick={load} className="w-full">
              {t("Couldn't load more · tap to retry")}
            </button>
          ) : loading ? (
            t("Loading…")
          ) : (
            t("{n} more", { n: total - words.length })
          )}
        </li>
      )}
    </ul>
  );
}
