import { describe, expect, it, vi } from "vitest";
import { ConsoleNER, type Entity } from "../src";

type Metadata = { local?: string; shared?: string; global?: boolean };

describe("entity validation", () => {
  it.each([
    [0.79, 0.8, 1, "valid"],
    [0.8, 0.8, 0, "skipped"],
    [0.81, 0.8, 0, "skipped"],
  ] as const)(
    "uses strict below semantics for confidence %s and threshold %s",
    async (confidence, threshold, expectedCalls, status) => {
      const validate = vi.fn(() => ({ valid: true, confidence: 1 }));
      const ner = new ConsoleNER<"id">().register({
        tag: "id",
        pattern: /id/,
        confidence,
        validator: { runBelowConfidence: threshold, validate },
      });
      const result = await ner.validate(ner.recognize("id"));
      expect(validate).toHaveBeenCalledTimes(expectedCalls);
      expect(result.entities[0]?.validation?.status).toBe(status);
    },
  );

  it("applies validation fields and shallow-merges metadata without mutating recognition", async () => {
    const ner = new ConsoleNER<"id", undefined, Metadata>().register({
      tag: "id",
      pattern: /ABC/,
      confidence: 0.5,
      metadata: () => ({ local: "yes", shared: "pattern" }),
      validator: {
        validate: () => ({
          valid: true,
          confidence: 2,
          normalizedValue: "abc",
          metadata: { shared: "validator" },
        }),
      },
    });
    const initial = ner.recognize("ABC");
    const validated = await ner.validate(initial);
    expect(validated).not.toBe(initial);
    expect(validated.entities[0]).not.toBe(initial.entities[0]);
    expect(initial.entities[0]).toMatchObject({ confidence: 0.5, normalizedValue: "ABC" });
    expect(validated.entities[0]).toMatchObject({
      confidence: 1,
      normalizedValue: "abc",
      metadata: { local: "yes", shared: "validator" },
      validation: { status: "valid" },
    });
  });

  it("marks invalid results and defaults their confidence to zero", async () => {
    const ner = new ConsoleNER().register({
      tag: "id",
      pattern: /id/,
      confidence: 0.4,
      validator: { validate: () => ({ valid: false }) },
    });
    expect((await ner.validate(ner.recognize("id"))).entities[0]).toMatchObject({
      confidence: 0,
      validation: { status: "invalid" },
    });
  });

  it("isolates validator errors and invokes the error hook", async () => {
    const onValidationError = vi.fn();
    const ner = new ConsoleNER({ onValidationError }).register({
      tag: "id",
      pattern: /id/,
      confidence: 0.4,
      validator: { id: "broken", validate: () => { throw new Error("offline"); } },
    });
    const initial = ner.recognize("id");
    const result = await ner.validate(initial);
    expect(result.entities[0]).toMatchObject({
      value: "id",
      confidence: 0.4,
      validation: { status: "error", validatorId: "broken" },
    });
    expect(onValidationError).toHaveBeenCalledTimes(1);
  });

  it("runs validators concurrently up to the configured limit", async () => {
    let active = 0;
    let maximum = 0;
    const ner = new ConsoleNER({ validationConcurrency: 2 }).register({
      tag: "id",
      pattern: /id/g,
      confidence: 0,
      validator: {
        validate: async () => {
          active++;
          maximum = Math.max(maximum, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active--;
          return { valid: true };
        },
      },
    });
    await ner.validate(ner.recognize("id id id id"));
    expect(maximum).toBe(2);
  });

  it("passes services, text, options, and AbortSignal through context", async () => {
    const controller = new AbortController();
    controller.abort();
    const validate = vi.fn();
    const ner = new ConsoleNER<"id", { answer: number }>().register({
      tag: "id",
      pattern: /id/,
      confidence: 0,
      validator: { validate },
    });
    const initial = ner.recognize("id", { tags: ["id"] });
    const result = await ner.validate(initial, { services: { answer: 42 } }, { signal: controller.signal });
    expect(validate).not.toHaveBeenCalled();
    expect(result.entities[0]?.validation?.status).toBe("aborted");
  });
});

describe("global validation", () => {
  it.each([
    [[0.95, 0.89], 0.9, 1, "completed"],
    [[0.9, 0.9], 0.9, 0, "skipped"],
    [[0.91, 1], 0.9, 0, "skipped"],
  ] as const)("evaluates all current confidences", async (scores, threshold, calls, status) => {
    const validate = vi.fn(() => ({}));
    const ner = new ConsoleNER({
      validator: { runBelowConfidence: threshold, validate },
    }).register(
      scores.map((score, index) => ({
        id: `pattern-${index}`,
        tag: `tag-${index}`,
        pattern: new RegExp(String(index)),
        confidence: score,
      })),
    );
    const result = await ner.validate(ner.recognize("0 1"));
    expect(validate).toHaveBeenCalledTimes(calls);
    expect(result.validation?.global.status).toBe(status);
  });

  it("skips empty results by default and runs when runOnEmpty is true", async () => {
    const skipped = vi.fn(() => ({}));
    const enabled = vi.fn(() => ({}));
    const first = new ConsoleNER({ validator: { validate: skipped } });
    const second = new ConsoleNER({ validator: { runOnEmpty: true, validate: enabled } });
    expect((await first.validate(first.recognize("none"))).validation?.global.status).toBe("skipped");
    expect((await second.validate(second.recognize("none"))).validation?.global.status).toBe("completed");
    expect(skipped).not.toHaveBeenCalled();
    expect(enabled).toHaveBeenCalledOnce();
  });

  it("runs after entity validators and re-evaluates its threshold", async () => {
    const order: string[] = [];
    const global = vi.fn(() => { order.push("global"); return {}; });
    const ner = new ConsoleNER({
      validator: { runBelowConfidence: 0.9, validate: global },
    }).register({
      tag: "id",
      pattern: /id/,
      confidence: 0.8,
      validator: {
        validate: () => { order.push("entity"); return { valid: true, confidence: 1 }; },
      },
    });
    const result = await ner.validate(ner.recognize("id"));
    expect(order).toEqual(["entity"]);
    expect(global).not.toHaveBeenCalled();
    expect(result.validation?.global).toMatchObject({ status: "skipped" });
  });

  it("may replace, add, remove, normalize, and enrich entities and result metadata", async () => {
    const ner = new ConsoleNER<"local" | "global", undefined, Metadata, { source: string }>({
      validator: {
        runBelowConfidence: 1,
        validate: (result) => ({
          entities: [
            {
              ...(result.entities[0] as Entity<"local" | "global", Metadata>),
              tag: "global",
              normalizedValue: "enriched",
              confidence: 5,
              metadata: { global: true },
            },
          ],
          metadata: { source: "backend" },
        }),
      },
    }).register({ tag: "local", pattern: /value/, confidence: 0.5 });
    const result = await ner.validate(ner.recognize("value"));
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0]).toMatchObject({
      tag: "global",
      normalizedValue: "enriched",
      confidence: 1,
      metadata: { global: true },
    });
    expect(result.metadata).toEqual({ source: "backend" });
  });

  it("accepts newly discovered valid spans and rejects malformed replacement spans", async () => {
    const makeEntity = (start: number, end: number, value: string): Entity => ({
      id: `new:${start}:${end}`,
      tag: "new",
      value,
      normalizedValue: value,
      start,
      end,
      confidence: 0.7,
      source: "global",
    });
    const ner = new ConsoleNER({
      validator: {
        runOnEmpty: true,
        validate: () => ({ entities: [makeEntity(0, 3, "new"), makeEntity(0, 99, "bad")] }),
      },
    });
    const result = await ner.validate(ner.recognize("new"));
    expect(result.entities).toEqual([expect.objectContaining({ value: "new" })]);
  });

  it("isolates global errors after successful entity validation", async () => {
    const ner = new ConsoleNER({
      validator: { validate: () => { throw new Error("global offline"); } },
    }).register({
      tag: "id",
      pattern: /id/,
      confidence: 0,
      validator: { validate: () => ({ valid: true, confidence: 0.5 }) },
    });
    const result = await ner.validate(ner.recognize("id"));
    expect(result.entities[0]).toMatchObject({ confidence: 0.5, validation: { status: "valid" } });
    expect(result.validation?.global.status).toBe("error");
  });

  it("marks an eligible global validator aborted without invoking it", async () => {
    const controller = new AbortController();
    controller.abort();
    const validate = vi.fn(() => ({}));
    const ner = new ConsoleNER({ validator: { validate } }).register({
      tag: "id",
      pattern: /id/,
      confidence: 0,
    });
    const result = await ner.validate(ner.recognize("id"), {}, { signal: controller.signal });
    expect(validate).not.toHaveBeenCalled();
    expect(result.validation?.global.status).toBe("aborted");
  });

  it("recognizeAsync is equivalent to recognize followed by validate", async () => {
    const ner = new ConsoleNER().register({
      tag: "id",
      pattern: /id/,
      confidence: 0,
      validator: { validate: () => ({ valid: true, confidence: 1 }) },
    });
    expect(await ner.recognizeAsync("id")).toEqual(await ner.validate(ner.recognize("id")));
  });

  it("never invokes validators during synchronous recognition", () => {
    const entityValidate = vi.fn();
    const globalValidate = vi.fn();
    const ner = new ConsoleNER({ validator: { validate: globalValidate } }).register({
      tag: "id",
      pattern: /id/,
      validator: { validate: entityValidate },
    });
    ner.recognize("id");
    expect(entityValidate).not.toHaveBeenCalled();
    expect(globalValidate).not.toHaveBeenCalled();
  });
});
