import { TabBar } from "./TabBar";

/**
 * Shown the moment a screen is tapped, while the server fetches its data, so switching tabs
 * never feels stuck. Next.js prefetches it for every visible link.
 */
export function Skeleton({ tab }: { tab?: "/" | "/learn" | "/practice" | "/words" }) {
  return (
    <main className={`screen ${tab ? "with-tabs" : ""}`} aria-busy="true" aria-label="Loading">
      <div className="h-9 w-40 animate-pulse rounded-xl bg-[var(--line)]" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="card h-24 animate-pulse bg-[var(--field)]" />
      ))}
      {tab && <TabBar active={tab} />}
    </main>
  );
}
