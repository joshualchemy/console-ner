import { describe, expect, it } from "vitest";
import { ConsoleNER } from "../src";

describe("overlap resolution", () => {
  it("ranks priority, confidence, length, and registration order in that order", () => {
    const byPriority = new ConsoleNER().register([
      { id: "generic", tag: "generic", pattern: /12345/, priority: 1, confidence: 1 },
      { id: "specific", tag: "specific", pattern: /234/, priority: 2, confidence: 0.1 },
    ]);
    expect(byPriority.recognize("12345").entities[0]?.tag).toBe("specific");

    const byConfidence = new ConsoleNER().register([
      { tag: "low", pattern: /12345/, confidence: 0.7 },
      { tag: "high", pattern: /234/, confidence: 0.8 },
    ]);
    expect(byConfidence.recognize("12345").entities[0]?.tag).toBe("high");

    const byLength = new ConsoleNER().register([
      { tag: "short", pattern: /234/, confidence: 0.8 },
      { tag: "long", pattern: /12345/, confidence: 0.8 },
    ]);
    expect(byLength.recognize("12345").entities[0]?.tag).toBe("long");

    const byOrder = new ConsoleNER().register([
      { tag: "first", pattern: /123/, confidence: 0.8 },
      { tag: "second", pattern: /123/, confidence: 0.8 },
    ]);
    expect(byOrder.recognize("123").entities[0]?.tag).toBe("first");
  });

  it("keeps overlapping entities when either pattern opts in", () => {
    const ner = new ConsoleNER().register([
      { tag: "outer", pattern: /12345/, allowOverlap: true },
      { tag: "inner", pattern: /234/ },
    ]);
    expect(ner.recognize("12345").entities.map((entity) => entity.tag)).toEqual([
      "outer",
      "inner",
    ]);
  });
});

