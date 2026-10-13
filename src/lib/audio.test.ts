import { describe, expect, it } from "vitest";
import { audioKey, solved } from "./audio";

describe("audioKey", () => {
  it("is stable and ignores spacing, so the app finds what the script recorded", () => {
    expect(audioKey("Guten  Morgen! ")).toBe(audioKey("Guten Morgen!"));
    expect(audioKey("Guten Morgen!")).not.toBe(audioKey("Guten Abend!"));
    expect(audioKey("Guten Morgen!")).toMatch(/^[0-9a-z]{6,12}$/);
  });

  it("names exercises by their solved sentence", () => {
    expect(
      solved({
        id: "x",
        type: "cloze",
        de: "Ich ___ Tom.",
        en: "",
        base: "sein",
        answers: ["bin"],
      }),
    ).toBe("Ich bin Tom.");
  });
});
