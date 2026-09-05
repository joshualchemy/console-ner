import { compromiseMatcher, type CompromiseBuiltInPatternOptions } from "./compromise";
import type { BuiltInPattern } from "./types";

export function compromisePlacePattern(
  options?: Omit<CompromiseBuiltInPatternOptions<"place">, "tag"> & {
    readonly tag?: "place";
  },
): BuiltInPattern<"place">;
export function compromisePlacePattern<TTag extends string>(
  options: CompromiseBuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag>;
export function compromisePlacePattern(
  options: CompromiseBuiltInPatternOptions<string> = {},
): BuiltInPattern<string> {
  return {
    id: options.id ?? "builtin-compromise-place",
    tag: options.tag ?? "place",
    pattern: compromiseMatcher({
      selection: "place",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
      select: (document) => document.places(),
      normalizedValue: (_result, value) => value.replace(/\s+/g, " ").trim(),
    }),
    confidence: options.confidence ?? 0.82,
    priority: options.priority ?? 1,
  };
}
