import { describe, expect, it } from "vitest";
import { ConsoleNER } from "../src";

describe("tokenization", () => {
  it("segments surrounding text, adjacent entities, and a trailing span", () => {
    const ner = new ConsoleNER().register([
      { tag: "letter", pattern: /A/g },
      { tag: "number", pattern: /1/g },
    ]);
    const tokens = ner.tokenize(ner.recognize("before A1 after"));
    expect(tokens.map(({ type, value }) => [type, value])).toEqual([
      ["text", "before "],
      ["entity", "A"],
      ["entity", "1"],
      ["text", " after"],
    ]);
  });

  it("handles no entities and an entity spanning the whole input", () => {
    const ner = new ConsoleNER().register({ tag: "all", pattern: /^all$/ });
    expect(ner.tokenize(ner.recognize("nothing"))).toMatchObject([
      { type: "text", value: "nothing" },
    ]);
    expect(ner.tokenize(ner.recognize("all"))).toMatchObject([
      { type: "entity", value: "all" },
    ]);
  });

  it("chooses one deterministic span when allowed entities overlap", () => {
    const ner = new ConsoleNER().register([
      { tag: "whole", pattern: /abc/, allowOverlap: true, confidence: 0.9 },
      { tag: "part", pattern: /bc/, allowOverlap: true, confidence: 1 },
    ]);
    expect(ner.tokenize(ner.recognize("abc"))).toMatchObject([
      { type: "entity", value: "abc" },
    ]);
  });
});
