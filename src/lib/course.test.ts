import { describe, expect, it } from "vitest";
import { nextStep, PARTS, PASS, type Progress, UNITS } from "./course";

const all = (score = PASS) =>
  new Map(PARTS.map((part) => [part.kind, part.kind === "unit" ? score : 1]));

describe("nextStep", () => {
  const [first, second] = UNITS.map((unit) => unit.id);

  it("starts with the first unit's grammar", () => {
    expect(nextStep(new Map())).toMatchObject({ unit: { id: first }, part: { kind: "unit" } });
  });

  it("goes through a unit's parts, then the next unit, even after a failed check", () => {
    const progress: Progress = new Map([[first ?? "", new Map([["unit", 0]])]]);
    expect(nextStep(progress)?.part.kind).toBe("listen");
    progress.set(first ?? "", all(0));
    expect(nextStep(progress)).toMatchObject({ unit: { id: second }, part: { kind: "unit" } });
  });

  it("resumes the unit last worked on", () => {
    const third = UNITS[2]?.id ?? "";
    const progress: Progress = new Map([[third, new Map([["unit", PASS]])]]);
    expect(nextStep(progress, third)).toMatchObject({
      unit: { id: third },
      part: { kind: "listen" },
    });
    expect(nextStep(progress)).toMatchObject({ unit: { id: first } });
  });

  it("comes back to failed grammar once everything was tried, then is done", () => {
    const progress: Progress = new Map(UNITS.map((unit) => [unit.id, all()]));
    progress.set(second ?? "", all(0));
    expect(nextStep(progress)).toMatchObject({ unit: { id: second }, part: { kind: "unit" } });
    progress.set(second ?? "", all());
    expect(nextStep(progress)).toBeNull();
  });
});
