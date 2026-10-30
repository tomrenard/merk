"use client";

import { useEffect, useState } from "react";
import type { SyncBatch, SyncEvent } from "./api/sync/route";

/**
 * What the phone did and the server hasn't saved yet (answers, finished lessons), kept across
 * reloads, sent in order to /api/sync whenever there is a connection. iOS has no background
 * sync: the queue goes out on each new event, when the connection comes back, and on reopening
 * the app.
 */
const KEY = "merk-outbox";

/** The route takes this many at a time; the rest goes in the next request. */
const MAX = 500;

/** `id`: so a request removes only what it sent, even with another tab sending too. */
type Queued = SyncEvent & { id: string };

function read(): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(events: Queued[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(events));
  } catch {}
  window.dispatchEvent(new Event(KEY));
}

/** Review cards answered here but not sent yet. */
export const unsentCards = () =>
  new Set(read().flatMap((event) => (event.type === "grade" ? [event.cardId] : [])));

type Unstamped<E> = E extends SyncEvent ? Omit<E, "at"> : never;

/** Keeps `event` (stamped with the time now) and tries to send it. */
export function queue(event: Unstamped<SyncEvent>) {
  write([...read(), { ...event, at: Date.now(), id: crypto.randomUUID() } as Queued]);
  void flush();
}

/** Fired once lesson results reached the server. */
export const SYNCED = "merk-synced";

/** `sent`: the server answered (all sent events saved); `batch`: the next review cards. */
type Result = { sent: boolean; batch: SyncBatch | null };

let sending: Promise<Result> | null = null;

/**
 * Sends what is queued; with `batch`, also asks for the next review cards. Events leave the
 * queue only once the server says it saved them.
 */
export function flush(batch = false): Promise<Result> {
  if (sending) {
    // One request at a time, so events reach the server in order.
    return sending.then(() => flush(batch));
  }
  const events = read().slice(0, MAX);
  if (!events.length && !batch) return Promise.resolve({ sent: true, batch: null });
  let more = false;
  sending = (async () => {
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events, batch }),
        // A bus connection can hang without failing: give up and try later.
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) return { sent: false, batch: null };
      const body = (await response.json()) as { applied: number; batch?: SyncBatch };
      const saved = new Set(events.slice(0, body.applied).map((event) => event.id));
      const left = read().filter((event) => !saved.has(event.id));
      write(left);
      more = body.applied === events.length && left.length > 0;
      // Lessons changed: pages kept in the browser must not show them undone (see Offline).
      if (events.some((event) => saved.has(event.id) && event.type !== "grade")) {
        window.dispatchEvent(new Event(SYNCED));
      }
      return { sent: body.applied === events.length, batch: body.batch ?? null };
    } catch {
      // Offline, timed out, or signed out (redirected to the login page, not JSON).
      return { sent: false, batch: null };
    } finally {
      sending = null;
      // Queued while this request was on its way.
      if (more) void flush();
    }
  })();
  return sending;
}

/**
 * Before logging out: sends what is queued, then forgets everything this account left on the
 * phone (queue, review batch, saved pages), so the next person neither sees nor inherits it.
 * False when answers couldn't be sent (offline): nothing is forgotten then.
 */
export async function forget() {
  if (!(await flush()).sent) return false;
  try {
    for (const key of Object.keys(localStorage)) {
      if (key === KEY || key.startsWith("merk-review-")) localStorage.removeItem(key);
    }
  } catch {}
  forgetPages();
  return true;
}

/** Signed out: the service worker drops kept pages, and any it is still loading. */
export function forgetPages() {
  navigator.serviceWorker?.controller?.postMessage({ forget: true });
}

/** Whether there is a connection, and how many events wait; sends the queue when back online. */
export function useOutbox() {
  const [online, setOnline] = useState(true);
  const [waiting, setWaiting] = useState(0);
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      setWaiting(read().length);
    };
    const retry = () => {
      update();
      // Also when the app goes to the background: the last answers of a session go out.
      if (navigator.onLine) void flush();
    };
    retry();
    window.addEventListener(KEY, update);
    window.addEventListener("online", retry);
    window.addEventListener("offline", update);
    document.addEventListener("visibilitychange", retry);
    return () => {
      window.removeEventListener(KEY, update);
      window.removeEventListener("online", retry);
      window.removeEventListener("offline", update);
      document.removeEventListener("visibilitychange", retry);
    };
  }, []);
  return { online, waiting };
}
