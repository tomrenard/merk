import { describe, expect, it } from "vitest";
import { buildsFrom } from "./units.ts";

describe("buildsFrom", () => {
  it.each([
    ["Ich wohne in Berlin.", ["wohne", "Ich", "in Berlin"], true],
    ["In Berlin wohne ich.", ["wohne", "ich", "In Berlin"], true],
    ["Ich wohne Berlin.", ["wohne", "Ich", "in Berlin"], false],
    ["Ich wohne in Berlin gern.", ["wohne", "Ich", "in Berlin"], false],
  ])("%s from %j → %s", (sentence, tiles, ok) => {
    expect(buildsFrom(sentence, tiles)).toBe(ok);
  });
});
