import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Exam, examProblems } from "./exams.ts";
import { PARTS_OF_COURSE } from "./parts.ts";
import { seededShuffle } from "./shuffle.ts";
import { buildsFrom, SYLLABUS, Unit, unitProblems } from "./units.ts";
import { UNITS } from "./units-index.ts";

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

describe("seededShuffle", () => {
  it("gives the same order for the same seed, different for others", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(seededShuffle(items, "a1-01-02")).toEqual(seededShuffle(items, "a1-01-02"));
    expect(seededShuffle(items, "a1-01-02")).not.toEqual(seededShuffle(items, "a1-01-03"));
    expect([...seededShuffle(items, "x")].sort()).toEqual(items);
  });
});

describe("course structure", () => {
  it("lists every syllabus lesson exactly once", () => {
    const course = PARTS_OF_COURSE.flatMap((part) => part.lessons as readonly string[]);
    expect(new Set(course).size).toBe(course.length);
    expect([...course].sort()).toEqual(SYLLABUS.map((s) => s.id).sort());
  });
});

const examDir = new URL("../../data/exams/", import.meta.url).pathname;
describe.each(readdirSync(examDir).filter((f) => f.endsWith(".json")))("data/exams/%s", (file) => {
  it("has the right shape and no problems", () => {
    const exam = Exam.parse(JSON.parse(readFileSync(`${examDir}${file}`, "utf8")));
    expect(exam.id).toBe(file.replace(".json", ""));
    expect(examProblems(exam)).toEqual([]);
  });
});

describe("units-index", () => {
  it("lists every lesson file (run `pnpm units:index` after adding one)", () => {
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(UNITS.map((u) => u.id).sort()).toEqual(files.map((f) => f.replace(".json", "")).sort());
  });
});
