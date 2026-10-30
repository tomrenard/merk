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

function read(): SyncEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(events: SyncEvent[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(events));
  } catch {}
  window.dispatchEvent(new Event(KEY));
}

/** Events waiting to be sent. */
export const pending = read;

type Unstamped<E> = E extends SyncEvent ? Omit<E, "at"> : never;

/** Keeps `event` (stamped with the time now) and tries to send it. */
export function queue(event: Unstamped<SyncEvent>) {
  write([...read(), { ...event, at: Date.now() } as SyncEvent]);
  void flush();
}

/** Fired once lesson results reached the server. */
export const SYNCED = "merk-synced";

let sending: Promise<SyncBatch | null> | null = null;

/**
 * Sends what is queued; with `batch`, also asks for the next review cards (null when offline).
 * Only sent events leave the queue, and only once the server answered.
 */
export function flush(batch = false): Promise<SyncBatch | null> {
  if (sending) {
    // One request at a time, so events reach the server in order.
    return batch ? sending.then(() => flush(true)) : sending;
  }
  const events = read();
  if (!events.length && !batch) return Promise.resolve(null);
  sending = (async () => {
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events, batch }),
      });
      if (!response.ok) return null;
      const body = (await response.json()) as { batch?: SyncBatch };
      write(read().slice(events.length));
      // Lessons changed: pages kept in the browser must not show them undone (see Synced).
      if (events.some((event) => event.type !== "grade")) window.dispatchEvent(new Event(SYNCED));
      return body.batch ?? null;
    } catch {
      // Offline, or signed out (redirected to the login page, not JSON): try again later.
      return null;
    } finally {
      sending = null;
    }
  })();
  return sending;
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
      if (navigator.onLine && document.visibilityState === "visible") void flush();
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
