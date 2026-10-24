"use client";

import Link from "next/link";
import { useState } from "react";

type Tab = { href: string; label: string; icon: string };

/**
 * Floating glass tab bar (iOS 26 style): equal tabs with labels, and a glass pill that slides to
 * the tapped tab at once, before the page arrives.
 */
export function Dock({ tabs, active, label }: { tabs: Tab[]; active: string; label: string }) {
  // Each page renders its own Dock, so a tap only has to last until the next page mounts.
  const [tapped, setTapped] = useState<string | null>(null);
  const current = tapped ?? active;
  const index = tabs.findIndex((tab) => tab.href === current);
  return (
    <nav className="dock" aria-label={label}>
      <ul
        className="glass dock-tabs"
        style={{ "--i": Math.max(0, index), "--n": tabs.length } as React.CSSProperties}
      >
        {index >= 0 && <li className="dock-pill" aria-hidden="true" />}
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              // Loads the whole tab in the background, so tapping it shows it at once.
              prefetch
              aria-current={tab.href === current ? "page" : undefined}
              className="dock-tab"
              onClick={(e) => {
                // A new browser tab (cmd/ctrl/shift or middle click) leaves this page as it is.
                if (!(e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)) setTapped(tab.href);
              }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={tab.icon} />
              </svg>
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
