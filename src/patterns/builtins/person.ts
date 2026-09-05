import type { BuiltInPattern, BuiltInPatternOptions } from "./types";
import { builtInId, capturedPattern } from "./utilities";
import { compromiseMatcher, type CompromiseBuiltInPatternOptions } from "./compromise";

export function compromisePersonPattern(
  options?: Omit<CompromiseBuiltInPatternOptions<"person">, "tag"> & {
    readonly tag?: "person";
  },
): BuiltInPattern<"person">;
export function compromisePersonPattern<TTag extends string>(
  options: CompromiseBuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag>;
export function compromisePersonPattern(
  options: CompromiseBuiltInPatternOptions<string> = {},
): BuiltInPattern<string> {
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

export function personPatterns(
  options?: Omit<BuiltInPatternOptions<"person">, "tag"> & {
    readonly tag?: "person";
  },
): readonly BuiltInPattern<"person">[];
export function personPatterns<TTag extends string>(
  options: BuiltInPatternOptions<TTag> & { readonly tag: TTag },
): readonly BuiltInPattern<TTag>[];
export function personPatterns(
  options: BuiltInPatternOptions<string> = {},
): readonly BuiltInPattern<string>[] {
  const tag = options.tag ?? "person";
  const priority = options.priority ?? 0;
  const title = String.raw`(?:Dr|Mr|Mrs|Ms|Miss|Mx|Prof|Professor|Rev|Judge|President|Senator|Sir|Dame)`;
  const token = String.raw`(?:\p{Lu}\.|\p{Lu}[\p{L}\p{M}]*(?:[’'][\p{L}\p{M}]+|[-‐‑–]\p{Lu}[\p{L}\p{M}]*)*)`;
  const particle = String.raw`(?:da|de|del|della|der|di|dos|du|la|le|van|von|bin|ibn|al)`;
  const tail = String.raw`(?:\s+(?:${particle}\s+){0,2}${token})`;
  const name = String.raw`${token}${tail}{0,3}`;
  const fullName = String.raw`${token}${tail}{1,3}`;
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  const nonNameStarts = new Set([
    "a",
    "an",
    "and",
    "application",
    "archive",
    "contact",
    "date",
    "email",
    "follow",
    "friday",
    "monday",
    "please",
    "request",
    "review",
    "saturday",
    "source",
    "sunday",
    "the",
    "this",
    "thursday",
    "tuesday",
    "wednesday",
  ]);
  const isLikelyName = (value: string) => {
    const firstWord = value
      .trim()
      .split(/\s+/)[0]
      ?.replace(/[.'’]/g, "")
      .toLocaleLowerCase();
    return firstWord !== undefined && !nonNameStarts.has(firstWord);
  };
  return [
    {
      id: builtInId(options.id, "person-honorific"),
      tag,
      pattern: capturedPattern(
        new RegExp(String.raw`\b${title}\.?\s+(${name})`, "gu"),
      ),
      confidence: options.confidence ?? 0.97,
      priority,
      normalize,
    },
    {
      id: builtInId(options.id, "person-context"),
      tag,
      pattern: capturedPattern(
        new RegExp(
          String.raw`\b(?:[Aa]sk|[Cc]all|[Cc]alled|[Cc]ontact|[Ee]mail|[Nn]amed|[Rr]each|[Tt]ell)\s+(?:${title}\.?\s+)?(${name})`,
          "gu",
        ),
      ),
      confidence: options.confidence ?? 0.92,
      priority,
      normalize,
    },
    {
      id: builtInId(options.id, "person-full-name"),
      tag,
      pattern: capturedPattern(
        new RegExp(
          String.raw`(?<![\p{L}\p{M}’'‐‑–-])${fullName}(?![\p{L}\p{M}’'‐‑–-])`,
          "gu",
        ),
        0,
        isLikelyName,
      ),
      confidence: options.confidence ?? 0.82,
      priority,
      normalize,
    },
  ];
}
