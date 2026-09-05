import { regexPattern } from "../regexPattern";
import type { BuiltInPattern, BuiltInPatternOptions } from "./types";
import { builtInId } from "./utilities";

export function datePatterns(
  options?: Omit<BuiltInPatternOptions<"date">, "tag"> & { readonly tag?: "date" },
): readonly BuiltInPattern<"date">[];
export function datePatterns<TTag extends string>(
  options: BuiltInPatternOptions<TTag> & { readonly tag: TTag },
): readonly BuiltInPattern<TTag>[];
export function datePatterns(
  options: BuiltInPatternOptions<string> = {},
): readonly BuiltInPattern<string>[] {
  const tag = options.tag ?? "date";
  const priority = options.priority ?? 0;
  const month = String.raw`(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)`;
  const definitions = [
    {
      suffix: "date-month-first",
      regex: new RegExp(
        String.raw`\b${month}\s+(?:0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?,?\s+\d{4}\b`,
        "gi",
      ),
      confidence: 0.91,
    },
    {
      suffix: "date-day-first",
      regex: new RegExp(
        String.raw`\b(?:0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\s+${month}\s+\d{4}\b`,
        "gi",
      ),
      confidence: 0.91,
    },
    {
      suffix: "date-iso",
      regex: /\b\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g,
      confidence: 0.97,
    },
    {
      suffix: "date-us-numeric",
      regex:
        /\b(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])[/-](?:\d{2}|\d{4})\b/g,
      confidence: 0.9,
    },
    {
      suffix: "date-dotted",
      regex: /\b(?:0?[1-9]|[12]\d|3[01])\.(?:0?[1-9]|1[0-2])\.\d{4}\b/g,
      confidence: 0.88,
    },
  ] as const;
  return definitions.map((definition) =>
    regexPattern({
      id: builtInId(options.id, definition.suffix),
      tag,
      regex: definition.regex,
      confidence: options.confidence ?? definition.confidence,
      priority,
    }),
  );
}
