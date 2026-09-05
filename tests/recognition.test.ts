import { describe, expect, it, vi } from "vitest";
import {
  ConsoleNER,
  clampConfidence,
  emailPattern,
  phonePattern,
  regexPattern,
  type MatchContext,
} from "../src";

describe("registration and recognition", () => {
  it("registers one or many patterns, supports shared tags, and removes them", () => {
    const ner = new ConsoleNER<"word">();
    ner.register({ id: "one", tag: "word", pattern: /one/g });
    ner.register([
      { id: "two", tag: "word", pattern: /two/g },
      { id: "three", tag: "word", pattern: /three/g },
    ]);
    expect(ner.recognize("one two three").entities).toHaveLength(3);
    expect(ner.unregisterPattern("two")).toBe(true);
    expect(ner.recognize("one two three").entities.map((entity) => entity.value)).toEqual([
      "one",
      "three",
    ]);
    expect(ner.unregisterTag("word")).toBe(2);
    expect(ner.recognize("one three").entities).toEqual([]);
    ner.register({ id: "again", tag: "word", pattern: /again/ }).clear();
    expect(ner.recognize("again").entities).toEqual([]);
  });

  it("enables, disables, filters, and excludes patterns", () => {
    const ner = new ConsoleNER<"alpha" | "numeric">();
    ner.register([
      { id: "alpha", tag: "alpha", pattern: /abc/g },
      { id: "numeric", tag: "numeric", pattern: /123/g },
    ]);
    expect(ner.disablePattern("alpha")).toBe(true);
    expect(ner.disablePattern("missing")).toBe(false);
    expect(ner.recognize("abc 123").entities.map((entity) => entity.tag)).toEqual(["numeric"]);
    expect(ner.enablePattern("alpha")).toBe(true);
    expect(ner.recognize("abc 123", { tags: ["alpha"] }).entities).toHaveLength(1);
    expect(ner.recognize("abc 123", { excludeTags: ["alpha"] }).entities).toHaveLength(1);
  });

  it("includes and excludes individual pattern IDs", () => {
    const ner = new ConsoleNER<"word">().register([
      { id: "first", tag: "word", pattern: /one/g },
      { id: "second", tag: "word", pattern: /two/g },
      { id: "third", tag: "word", pattern: /three/g },
    ]);

    const included = ner.recognize("one two three", { patternIds: ["first", "third"] });
    expect(included.entities.map((entity) => entity.value)).toEqual(["one", "three"]);
    expect(included.recognitionOptions?.patternIds).toEqual(["first", "third"]);

    const excluded = ner.recognize("one two three", { excludePatternIds: ["second"] });
    expect(excluded.entities.map((entity) => entity.value)).toEqual(["one", "three"]);
    expect(excluded.recognitionOptions?.excludePatternIds).toEqual(["second"]);
  });

  it("memoizes shared analysis for matchers during one recognition", () => {
    const key = {};
    const createAnalysis = vi.fn(() => ({ ready: true }));
    const matcher = (value: string, start: number) =>
      (_text: string, context: Parameters<NonNullable<ReturnType<typeof regexPattern>["pattern"]>>[1]) => {
        context.memoize(key, createAnalysis);
        return [{ value, start, end: start + value.length }];
      };
    const ner = new ConsoleNER<"word">().register([
      { id: "one", tag: "word", pattern: matcher("one", 0) },
      { id: "two", tag: "word", pattern: matcher("two", 4) },
    ]);

    ner.recognize("one two");
    expect(createAnalysis).toHaveBeenCalledTimes(1);
    ner.recognize("one two");
    expect(createAnalysis).toHaveBeenCalledTimes(2);
  });

  it("handles global, non-global, insensitive regexes and never mutates lastIndex", () => {
    const regex = /hello/gi;
    regex.lastIndex = 2;
    const ner = new ConsoleNER().register({ tag: "greeting", pattern: regex });
    const first = ner.recognize("Hello hello");
    const second = ner.recognize("Hello hello");
    expect(first).toEqual(second);
    expect(first.entities.map((entity) => entity.value)).toEqual(["Hello", "hello"]);
    expect(regex.lastIndex).toBe(2);

    const single = new ConsoleNER().register({ tag: "x", pattern: /x/ });
    expect(single.recognize("x x").entities).toHaveLength(2);
  });

  it("preserves exact positions across unicode, punctuation, and multiline text", () => {
    const text = "🙂 Email: a@b.com\nthen a@b.com!";
    const result = new ConsoleNER().register(emailPattern()).recognize(text);
    expect(result.entities).toHaveLength(2);
    for (const entity of result.entities) {
      expect(text.slice(entity.start, entity.end)).toBe(entity.value);
    }
  });

  it("normalizes, merges metadata, and applies match confidence precedence", () => {
    type Metadata = { fromPattern?: boolean; shared?: string; fromMatch?: boolean };
    const ner = new ConsoleNER<"code", undefined, Metadata>();
    ner.register({
      tag: "code",
      pattern: () => [
        {
          value: "ABC-1",
          start: 0,
          end: 5,
          confidence: 4,
          normalizedValue: "override",
          metadata: { shared: "match", fromMatch: true },
        },
      ],
      confidence: 0.2,
      normalize: () => "pattern-normalized",
      metadata: () => ({ fromPattern: true, shared: "pattern" }),
    });
    const entity = ner.recognize("ABC-1").entities[0];
    expect(entity).toMatchObject({
      value: "ABC-1",
      normalizedValue: "override",
      confidence: 1,
      metadata: { fromPattern: true, shared: "match", fromMatch: true },
    });
  });

  it("provides bounded context to confidence, normalization, and metadata callbacks", () => {
    const confidence = vi.fn((_value: string, _context: MatchContext) => 0.8);
    const ner = new ConsoleNER<"id">({ contextWindow: 3 });
    ner.register({ tag: "id", pattern: /123/, confidence });
    ner.recognize("abcdef123ghijkl");
    expect(confidence.mock.calls[0]?.[1]).toMatchObject({ before: "def", after: "ghi" });
  });

  it("ignores invalid custom matches and deduplicates identical pattern spans", () => {
    const ner = new ConsoleNER().register({
      tag: "x",
      pattern: () => [
        { value: "wrong", start: 0, end: 1 },
        { value: "x", start: -1, end: 0 },
        { value: "x", start: 0, end: 1 },
        { value: "x", start: 0, end: 1 },
      ],
    });
    expect(ner.recognize("x").entities).toHaveLength(1);
  });

  it("offers ergonomic regex and optional built-in helpers", () => {
    const ner = new ConsoleNER<"email" | "phone">().register([
      regexPattern<"email" | "phone">({ tag: "email", regex: /nobody@example\.com/i }),
      phonePattern(),
    ]);
    const result = ner.recognize("NOBODY@example.com or (850) 555-1212");
    expect(result.entities[0]?.normalizedValue).toBe("NOBODY@example.com");
    expect(result.entities[1]?.normalizedValue).toBe("+18505551212");
  });

  it("keeps built-in default tags narrow inside a typed tag union", () => {
    const ner = new ConsoleNER<"email" | "phone">().register([
      emailPattern(),
      phonePattern(),
    ]);
    expect(ner.recognize("a@b.com and 850-555-1212").entities.map((entity) => entity.tag)).toEqual([
      "email",
      "phone",
    ]);
  });

  it("clamps all confidence values", () => {
    expect(clampConfidence(-4)).toBe(0);
    expect(clampConfidence(4)).toBe(1);
    expect(clampConfidence(Number.NaN)).toBe(0);
    expect(new ConsoleNER({ defaultConfidence: 5 }).register({ tag: "x", pattern: /x/ }).recognize("x").entities[0]?.confidence).toBe(1);
  });
});
