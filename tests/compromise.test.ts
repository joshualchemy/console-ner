import { describe, expect, it } from "vitest";
import { emailPattern } from "../src";
import {
  COMPROMISE_RECOGNIZER_ID,
  createCompromiseNER,
  type CompromiseEntityMetadata,
} from "../src/compromise";

describe("Compromise recognizer", () => {
  it("ships as a named recognizer that can be disabled, enabled, and removed", () => {
    const ner = createCompromiseNER();

    expect(ner.listRecognizers()).toEqual([{
      id: COMPROMISE_RECOGNIZER_ID,
      enabled: true,
      patternIds: [
        "builtin-compromise-person",
        "builtin-compromise-organization",
        "builtin-compromise-place",
        "builtin-compromise-money",
      ],
    }]);
    expect(ner.recognize("Maya met Google in Paris about twelve dollars.").entities)
      .not.toHaveLength(0);

    expect(ner.disableRecognizer(COMPROMISE_RECOGNIZER_ID)).toBe(true);
    expect(ner.recognize("Maya met Google in Paris about twelve dollars.").entities).toEqual([]);
    expect(ner.enableRecognizer(COMPROMISE_RECOGNIZER_ID)).toBe(true);
    expect(ner.recognize("Maya met Google in Paris about twelve dollars.").entities)
      .not.toHaveLength(0);

    expect(ner.unregisterRecognizer(COMPROMISE_RECOGNIZER_ID)).toBe(true);
    expect(ner.listRecognizers()).toEqual([]);
  });

  it("can omit Compromise and compose its metadata with application patterns", () => {
    interface AppMetadata {
      readonly source: "application";
    }

    const empty = createCompromiseNER({ compromise: false });
    expect(empty.listRecognizers()).toEqual([]);

    const ner = createCompromiseNER<"email", undefined, AppMetadata>();
    ner.register({
      ...emailPattern(),
      metadata: () => ({ source: "application" }),
    });

    const entities = ner.recognize("Email maya@example.com. Later, mary met Google.").entities;
    const email = entities.find((entity) => entity.tag === "email");
    const person = entities.find((entity) => entity.tag === "person");
    expect(email?.metadata).toEqual({ source: "application" });
    expect((person?.metadata as CompromiseEntityMetadata | undefined)?.engine)
      .toBe("compromise");
  });
});
