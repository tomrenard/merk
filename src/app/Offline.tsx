"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "./Locale";
import { forget, forgetPages, SYNCED, useOutbox } from "./outbox";

/**
 * Installs the service worker (public/sw.js: pages, app and recordings work offline), says when
 * there is no connection or answers wait to be sent, and drops pages kept in the browser once
 * lesson results reach the server, so none shows them undone.
 */
export function Offline() {
  const { online, waiting } = useOutbox();
  const router = useRouter();
  const t = useT();
  useEffect(() => {
    // Not in dev: a cached page would hide every change.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      // This page's code loaded before the worker could keep it: hand it the list.
      navigator.serviceWorker.ready.then((registration) => {
        const keep = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((url) => url.startsWith(`${location.origin}/_next/static/`));
        // Pages reached by in-app links are never loaded whole, so never kept: an offline cold
        // start would find none. Keep the main ones now.
        registration.active?.postMessage({ keep, pages: ["/", "/review", "/learn"] });
      });
    }
    const refresh = () => router.refresh();
    window.addEventListener(SYNCED, refresh);
    return () => window.removeEventListener(SYNCED, refresh);
  }, [router]);
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/login") forgetPages();
  }, [pathname]);
  if (online && !waiting) return null;
  return (
    <p
      role="status"
      className="glass fixed top-[calc(env(safe-area-inset-top)+0.5rem)] left-1/2 z-50 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold"
    >
      {online ? "↻ " : "✈︎ "}
      {online ? t("Saving…") : t("Offline")}
      {waiting > 0 &&
        ` · ${t(waiting === 1 ? "{n} answer to send" : "{n} answers to send", { n: waiting })}`}
    </p>
  );
}

/** Log out, after sending and forgetting what this account left on the phone (outbox). */
export function LogOut({ action, label }: { action: () => Promise<void>; label: string }) {
  const t = useT();
  const [unsent, setUnsent] = useState(false);
  return (
    <form
      action={async () => {
        if (!(await forget())) return setUnsent(true);
        await action();
      }}
      className="mt-4 flex flex-col gap-2"
    >
      <button type="submit" className="btn">
        {label}
      </button>
      {unsent && (
        <p role="alert" className="muted text-center text-sm font-semibold">
          {t("Some answers aren't sent yet. Connect to the internet, then log out.")}
        </p>
      )}
    </form>
  );
}
