import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildsFrom, Unit, unitProblems } from "./units.ts";

describe("buildsFrom", () => {
  it.each([
    ["Ich wohne in Berlin.", ["wohne", "Ich", "in Berlin"], true],
    ["In Berlin wohne ich.", ["wohne", "ich", "In Berlin"], true],
    ["Ich wohne Berlin.", ["wohne", "Ich", "in Berlin"], false],
    ["Ich wohne in Berlin gern.", ["wohne", "Ich", "in Berlin"], false],
    ["Heute bin ich müde.", ["Ich", "bin", "heute", "müde"], true],
  ])("%s from %j → %s", (sentence, tiles, ok) => {
    expect(buildsFrom(sentence, tiles)).toBe(ok);
  });
});

const dir = new URL("../../data/units/", import.meta.url).pathname;

describe.each(readdirSync(dir).filter((f) => f.endsWith(".json")))("data/units/%s", (file) => {
  it("has the right shape and no problems", () => {
    const unit = Unit.parse(JSON.parse(readFileSync(`${dir}${file}`, "utf8")));
    expect(unit.id).toBe(file.replace(".json", ""));
    expect(unitProblems(unit)).toEqual([]);
  });
});
