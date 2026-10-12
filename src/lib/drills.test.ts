import { describe, expect, it } from "vitest";
import { drills, isRightDrill, spokenTime } from "./drills.ts";

describe("spokenTime", () => {
  it.each([
    [3, 0, "drei Uhr"],
    [3, 15, "Viertel nach drei"],
    [3, 30, "halb vier"],
    [3, 45, "Viertel vor vier"],
    [3, 10, "zehn nach drei"],
    [3, 50, "zehn vor vier"],
    [12, 30, "halb eins"],
    [11, 55, "fünf vor zwölf"],
  ])("%i:%i → %s", (hour, minute, said) => {
    expect(spokenTime(hour, minute)).toBe(said);
  });
});

describe("drills", () => {
  it("makes answerable items", () => {
    for (const drill of drills(200)) {
      expect(drill.say).not.toBe("");
      expect(isRightDrill(drill.answers[0] ?? "", drill)).toBe(true);
    }
  });

  it("accepts the usual ways to write an answer", () => {
    const time = {
      kind: "Time",
      say: "halb vier",
      answers: ["3:30", "15:30", "03:30"],
      shown: "3:30",
    };
    expect(isRightDrill("15:30", time)).toBe(true);
    expect(isRightDrill("4:30", time)).toBe(false);
    const price = { kind: "Price", say: "3 Euro 49", answers: ["3,49", "3.49"], shown: "3,49 €" };
    expect(isRightDrill("3,49 €", price)).toBe(true);
    const name = { kind: "Spelled name", say: "Emm, Ü", answers: ["Müller"], shown: "Müller" };
    expect(isRightDrill("müller", name)).toBe(true);
    expect(isRightDrill("Mueller", name)).toBe(true);
  });
});
