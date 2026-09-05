import { regexPattern } from "../regexPattern";
import type { BuiltInPattern, BuiltInPatternOptions } from "./types";
import { compromiseMatcher, type CompromiseBuiltInPatternOptions } from "./compromise";

export function compromiseOrganizationPattern(
  options?: Omit<CompromiseBuiltInPatternOptions<"organization">, "tag"> & {
    readonly tag?: "organization";
  },
): BuiltInPattern<"organization">;
export function compromiseOrganizationPattern<TTag extends string>(
  options: CompromiseBuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag>;
export function compromiseOrganizationPattern(
  options: CompromiseBuiltInPatternOptions<string> = {},
): BuiltInPattern<string> {
  return {
    id: options.id ?? "builtin-compromise-organization",
    tag: options.tag ?? "organization",
    pattern: compromiseMatcher({
      selection: "organization",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
      select: (document) => document.organizations(),
      normalizedValue: (_result, value) => value.replace(/\s+/g, " ").trim(),
    }),
    confidence: options.confidence ?? 0.84,
    priority: options.priority ?? 1,
  };
}

export function organizationPattern(
  options?: Omit<BuiltInPatternOptions<"organization">, "tag"> & {
    readonly tag?: "organization";
  },
): BuiltInPattern<"organization">;
export function organizationPattern<TTag extends string>(
  options: BuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag>;
export function organizationPattern(
  options: BuiltInPatternOptions<string> = {},
): BuiltInPattern<string> {
  return regexPattern({
    id: options.id ?? "builtin-organization",
    tag: options.tag ?? "organization",
    regex: /\b(?:[A-Z][\p{L}\d&'.-]*\s+){1,4}(?:Analytics|Bank|Capital|Company|Corp\.?|Corporation|Holdings|Labs?|LLC|Systems|Inc\.?)\b/gu,
    confidence: options.confidence ?? 0.64,
    priority: options.priority ?? 0,
    normalize: (value) => value.replace(/\.$/, ""),
  });
}
