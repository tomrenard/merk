"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, ViewTransition } from "react";

const TABS = ["/", "/learn", "/practice", "/words"];

/**
 * Each screen animates in and out by how it was reached: Push and Back links slide (see
 * globals.css); tabs and everything else switch at once.
 */
export function Screens({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <ViewTransition
      // The four tabs count as one screen: switching between them starts no transition at all.
      key={TABS.includes(path) ? "tabs" : path}
      default="none"
      enter={{ push: "slide-in", back: "slide-back-in", default: "none" }}
      exit={{ push: "slide-out", back: "slide-back-out", default: "none" }}
    >
      {children}
    </ViewTransition>
  );
}
