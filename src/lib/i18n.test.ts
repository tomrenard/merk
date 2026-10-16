import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FR_KEYS, translator } from "./i18n";

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(join(dir, e.name))
      : /\.tsx?$/.test(e.name) && !e.name.includes(".test.")
        ? [join(dir, e.name)]
        : [],
  );
/** All source, minus the FR dictionary itself (its keys don't count as using them). */
const source = files("src")
  .map((f) => readFileSync(f, "utf8"))
  .join("\n")
  .replace(/const FR: Record<string, string> = \{[\s\S]*?\n\};/, "");

/** Literal keys in t("…") calls, including t(cond ? "a" : "b"). */
const used = new Set(
  [
    ...source.matchAll(
      /\bt\(\s*(?:[^,()"]*\?\s*)?"((?:[^"\\]|\\.)*)"(?:\s*:\s*"((?:[^"\\]|\\.)*)")?/g,
    ),
  ].flatMap((m) => [m[1], m[2]].filter((k): k is string => Boolean(k))),
);

describe("French UI", () => {
  it("translates every literal t() key", () => {
    const fr = new Set(FR_KEYS);
    expect([...used].filter((k) => !fr.has(k))).toEqual([]);
  });

  it("has no key that the code no longer uses (as a string anywhere)", () => {
    // Keys passed indirectly (labels in arrays) still appear as a quoted string.
    const stale = FR_KEYS.filter((k) => !source.includes(`"${k}"`));
    expect(stale).toEqual([]);
  });

  it("keeps placeholders and fills them", () => {
    const fr = translator("fr");
    for (const key of FR_KEYS) {
      const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
      expect(holes(fr(key)), key).toBe(holes(key));
    }
    expect(fr("{n} words", { n: 3 })).toBe("3 mots");
    expect(translator("en")("{n} words", { n: 3 })).toBe("3 words");
    expect(fr("Not in the list")).toBe("Not in the list");
  });
});
