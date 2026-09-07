import { describe, expect, it } from "vitest";
import {
  ConsoleNER,
  LANGUAGE_RECOGNIZER_ID,
  emailPattern,
  type LanguageEntityMetadata,
} from "../src";

describe("built-in language recognizer", () => {
  it("ships as a named recognizer that can be disabled, enabled, and removed", () => {
    const ner = new ConsoleNER();

    expect(ner.listRecognizers()).toEqual([{
      id: LANGUAGE_RECOGNIZER_ID,
      enabled: true,
      patternIds: [
        "builtin-language-person",
        "builtin-language-organization",
        "builtin-language-place",
        "builtin-language-money",
      ],
    }]);
    expect(ner.recognize("Maya met Google in Paris about twelve dollars.").entities)
      .not.toHaveLength(0);

    expect(ner.disableRecognizer(LANGUAGE_RECOGNIZER_ID)).toBe(true);
    expect(ner.recognize("Maya met Google in Paris about twelve dollars.").entities).toEqual([]);
    expect(ner.enableRecognizer(LANGUAGE_RECOGNIZER_ID)).toBe(true);
    expect(ner.recognize("Maya met Google in Paris about twelve dollars.").entities)
      .not.toHaveLength(0);

    expect(ner.unregisterRecognizer(LANGUAGE_RECOGNIZER_ID)).toBe(true);
    expect(ner.listRecognizers()).toEqual([]);
  });

  it("can omit language processing and compose its metadata with application patterns", () => {
    interface AppMetadata {
      readonly source: "application";
    }

    const empty = new ConsoleNER({ language: false });
    expect(empty.listRecognizers()).toEqual([]);

    const ner = new ConsoleNER<
      "email" | "person",
      undefined,
      AppMetadata | LanguageEntityMetadata
    >();
    ner.register({
      ...emailPattern(),
      metadata: () => ({ source: "application" }),
    });

    const entities = ner.recognize("Email maya@example.com. Later, mary met Google.").entities;
    const email = entities.find((entity) => entity.tag === "email");
    const person = entities.find((entity) => entity.tag === "person");
    expect(email?.metadata).toEqual({ source: "application" });
    expect((person?.metadata as LanguageEntityMetadata | undefined)?.category)
      .toBe("person");
  });
});
