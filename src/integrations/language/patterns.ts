import type { BuiltInPattern } from "../../patterns/builtins/types";
import { builtInId } from "../../patterns/builtins/utilities";
import {
  languageMatcher,
  type LanguageBuiltInPatternOptions,
  type LanguageEntityMetadata,
  type LanguageLexicon,
} from "./matcher";

export type LanguageBuiltInTag = "money" | "organization" | "person" | "place";

export interface LanguagePatternsOptions {
  readonly id?: string;
  readonly lexicon?: LanguageLexicon;
  readonly allowOverlap?: boolean;
}

export function languageMoneyPattern(
  options?: Omit<LanguageBuiltInPatternOptions<"money">, "tag"> & {
    readonly tag?: "money";
  },
): BuiltInPattern<"money", LanguageEntityMetadata>;
export function languageMoneyPattern<TTag extends string>(
  options: LanguageBuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag, LanguageEntityMetadata>;
export function languageMoneyPattern(
  options: LanguageBuiltInPatternOptions<string> = {},
): BuiltInPattern<string, LanguageEntityMetadata> {
  return {
    id: options.id ?? "builtin-language-money",
    tag: options.tag ?? "money",
    pattern: languageMatcher({
      category: "money",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
      select: (document) => document.money(),
      normalizedValue: (result, value) =>
        typeof result.money?.num === "number" ? String(result.money.num) : value,
    }),
    confidence: options.confidence ?? 0.9,
    priority: options.priority ?? 1,
  };
}

export function languageOrganizationPattern(
  options?: Omit<LanguageBuiltInPatternOptions<"organization">, "tag"> & {
    readonly tag?: "organization";
  },
): BuiltInPattern<"organization", LanguageEntityMetadata>;
export function languageOrganizationPattern<TTag extends string>(
  options: LanguageBuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag, LanguageEntityMetadata>;
export function languageOrganizationPattern(
  options: LanguageBuiltInPatternOptions<string> = {},
): BuiltInPattern<string, LanguageEntityMetadata> {
  return {
    id: options.id ?? "builtin-language-organization",
    tag: options.tag ?? "organization",
    pattern: languageMatcher({
      category: "organization",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
      select: (document) => document.organizations(),
      normalizedValue: (_result, value) => value.replace(/\s+/g, " ").trim(),
    }),
    confidence: options.confidence ?? 0.84,
    priority: options.priority ?? 1,
  };
}

export function languagePersonPattern(
  options?: Omit<LanguageBuiltInPatternOptions<"person">, "tag"> & {
    readonly tag?: "person";
  },
): BuiltInPattern<"person", LanguageEntityMetadata>;
export function languagePersonPattern<TTag extends string>(
  options: LanguageBuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag, LanguageEntityMetadata>;
export function languagePersonPattern(
  options: LanguageBuiltInPatternOptions<string> = {},
): BuiltInPattern<string, LanguageEntityMetadata> {
  return {
    id: options.id ?? "builtin-language-person",
    tag: options.tag ?? "person",
    pattern: languageMatcher({
      category: "person",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
      select: (document) => document.people(),
      normalizedValue: (_result, value) => value.replace(/\s+/g, " ").trim(),
    }),
    confidence: options.confidence ?? 0.86,
    priority: options.priority ?? 1,
  };
}

export function languagePlacePattern(
  options?: Omit<LanguageBuiltInPatternOptions<"place">, "tag"> & {
    readonly tag?: "place";
  },
): BuiltInPattern<"place", LanguageEntityMetadata>;
export function languagePlacePattern<TTag extends string>(
  options: LanguageBuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag, LanguageEntityMetadata>;
export function languagePlacePattern(
  options: LanguageBuiltInPatternOptions<string> = {},
): BuiltInPattern<string, LanguageEntityMetadata> {
  return {
    id: options.id ?? "builtin-language-place",
    tag: options.tag ?? "place",
    pattern: languageMatcher({
      category: "place",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
      select: (document) => document.places(),
      normalizedValue: (_result, value) => value.replace(/\s+/g, " ").trim(),
    }),
    confidence: options.confidence ?? 0.82,
    priority: options.priority ?? 1,
  };
}

export function languagePatterns(
  options: LanguagePatternsOptions = {},
): readonly BuiltInPattern<LanguageBuiltInTag, LanguageEntityMetadata>[] {
  return [
    languagePersonPattern({
      id: builtInId(options.id, "language-person"),
      tag: "person",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
      ...(options.allowOverlap === undefined ? {} : { allowOverlap: options.allowOverlap }),
    }),
    languageOrganizationPattern({
      id: builtInId(options.id, "language-organization"),
      tag: "organization",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
      ...(options.allowOverlap === undefined ? {} : { allowOverlap: options.allowOverlap }),
    }),
    languagePlacePattern({
      id: builtInId(options.id, "language-place"),
      tag: "place",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
      ...(options.allowOverlap === undefined ? {} : { allowOverlap: options.allowOverlap }),
    }),
    languageMoneyPattern({
      id: builtInId(options.id, "language-money"),
      tag: "money",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
      ...(options.allowOverlap === undefined ? {} : { allowOverlap: options.allowOverlap }),
    }),
  ];
}
