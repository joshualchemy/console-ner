import type { BuiltInPattern } from "../../patterns/builtins/types";
import { builtInId } from "../../patterns/builtins/utilities";
import {
  compromiseMatcher,
  type CompromiseBuiltInPatternOptions,
  type CompromiseEntityMetadata,
  type CompromiseLexicon,
} from "./matcher";

export type CompromiseBuiltInTag = "money" | "organization" | "person" | "place";

export interface CompromisePatternsOptions {
  readonly id?: string;
  readonly lexicon?: CompromiseLexicon;
  readonly allowOverlap?: boolean;
}

export function compromiseMoneyPattern(
  options?: Omit<CompromiseBuiltInPatternOptions<"money">, "tag"> & {
    readonly tag?: "money";
  },
): BuiltInPattern<"money", CompromiseEntityMetadata>;
export function compromiseMoneyPattern<TTag extends string>(
  options: CompromiseBuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag, CompromiseEntityMetadata>;
export function compromiseMoneyPattern(
  options: CompromiseBuiltInPatternOptions<string> = {},
): BuiltInPattern<string, CompromiseEntityMetadata> {
  return {
    id: options.id ?? "builtin-compromise-money",
    tag: options.tag ?? "money",
    pattern: compromiseMatcher({
      selection: "money",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
      select: (document) => document.money(),
      normalizedValue: (result, value) =>
        typeof result.money?.num === "number" ? String(result.money.num) : value,
    }),
    confidence: options.confidence ?? 0.9,
    priority: options.priority ?? 1,
  };
}

export function compromiseOrganizationPattern(
  options?: Omit<CompromiseBuiltInPatternOptions<"organization">, "tag"> & {
    readonly tag?: "organization";
  },
): BuiltInPattern<"organization", CompromiseEntityMetadata>;
export function compromiseOrganizationPattern<TTag extends string>(
  options: CompromiseBuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag, CompromiseEntityMetadata>;
export function compromiseOrganizationPattern(
  options: CompromiseBuiltInPatternOptions<string> = {},
): BuiltInPattern<string, CompromiseEntityMetadata> {
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

export function compromisePersonPattern(
  options?: Omit<CompromiseBuiltInPatternOptions<"person">, "tag"> & {
    readonly tag?: "person";
  },
): BuiltInPattern<"person", CompromiseEntityMetadata>;
export function compromisePersonPattern<TTag extends string>(
  options: CompromiseBuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag, CompromiseEntityMetadata>;
export function compromisePersonPattern(
  options: CompromiseBuiltInPatternOptions<string> = {},
): BuiltInPattern<string, CompromiseEntityMetadata> {
  return {
    id: options.id ?? "builtin-compromise-person",
    tag: options.tag ?? "person",
    pattern: compromiseMatcher({
      selection: "person",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
      select: (document) => document.people(),
      normalizedValue: (_result, value) => value.replace(/\s+/g, " ").trim(),
    }),
    confidence: options.confidence ?? 0.86,
    priority: options.priority ?? 1,
  };
}

export function compromisePlacePattern(
  options?: Omit<CompromiseBuiltInPatternOptions<"place">, "tag"> & {
    readonly tag?: "place";
  },
): BuiltInPattern<"place", CompromiseEntityMetadata>;
export function compromisePlacePattern<TTag extends string>(
  options: CompromiseBuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag, CompromiseEntityMetadata>;
export function compromisePlacePattern(
  options: CompromiseBuiltInPatternOptions<string> = {},
): BuiltInPattern<string, CompromiseEntityMetadata> {
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

export function compromisePatterns(
  options: CompromisePatternsOptions = {},
): readonly BuiltInPattern<CompromiseBuiltInTag, CompromiseEntityMetadata>[] {
  return [
    compromisePersonPattern({
      id: builtInId(options.id, "compromise-person"),
      tag: "person",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
      ...(options.allowOverlap === undefined ? {} : { allowOverlap: options.allowOverlap }),
    }),
    compromiseOrganizationPattern({
      id: builtInId(options.id, "compromise-organization"),
      tag: "organization",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
      ...(options.allowOverlap === undefined ? {} : { allowOverlap: options.allowOverlap }),
    }),
    compromisePlacePattern({
      id: builtInId(options.id, "compromise-place"),
      tag: "place",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
      ...(options.allowOverlap === undefined ? {} : { allowOverlap: options.allowOverlap }),
    }),
    compromiseMoneyPattern({
      id: builtInId(options.id, "compromise-money"),
      tag: "money",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
      ...(options.allowOverlap === undefined ? {} : { allowOverlap: options.allowOverlap }),
    }),
  ];
}
