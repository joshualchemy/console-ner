import nlp from "compromise";
import type View from "compromise/view/three";
import type { PatternMatcher, RecognitionContext } from "../../types/Pattern";
import type { BuiltInPatternOptions } from "../../patterns/builtins/types";

export type LanguageLexicon = Readonly<Record<string, string>>;

export interface LanguageBuiltInPatternOptions<TTag extends string>
  extends BuiltInPatternOptions<TTag> {
  readonly lexicon?: LanguageLexicon;
}

export interface LanguageEntityMetadata {
  readonly category: "money" | "organization" | "person" | "place";
  readonly details?: Readonly<Record<string, unknown>>;
  readonly terms?: readonly Readonly<{
    text?: string;
    tags?: readonly string[];
  }>[];
}

interface LanguageJsonResult {
  readonly offset?: {
    readonly start?: number;
    readonly length?: number;
  };
  readonly terms?: readonly Readonly<{
    text?: string;
    tags?: readonly string[];
  }>[];
  readonly person?: Readonly<Record<string, unknown>>;
  readonly money?: Readonly<Record<string, unknown>> & { readonly num?: unknown };
}

interface LanguageSelection {
  json(options: {
    readonly offset: true;
    readonly terms: { readonly text: true; readonly tags: true };
  }): unknown;
}

const defaultDocumentKey = Symbol("console-ner:language-document");
const lexiconDocumentKeys = new WeakMap<object, symbol>();

function documentKey(lexicon?: LanguageLexicon): symbol {
  if (!lexicon) return defaultDocumentKey;
  const existing = lexiconDocumentKeys.get(lexicon);
  if (existing) return existing;
  const key = Symbol("console-ner:language-document-with-lexicon");
  lexiconDocumentKeys.set(lexicon, key);
  return key;
}

function languageDocument(
  text: string,
  context: RecognitionContext,
  lexicon?: LanguageLexicon,
): View {
  return context.memoize(documentKey(lexicon), () =>
    nlp(text, lexicon ? { ...lexicon } : undefined),
  );
}

function trimTrailingPunctuation(text: string, start: number, end: number): number {
  while (end > start && /[.,;:!?]/u.test(text[end - 1] ?? "")) end -= 1;
  return end;
}

export function languageMatcher(options: {
  readonly category: LanguageEntityMetadata["category"];
  readonly lexicon?: LanguageLexicon;
  readonly select: (document: View) => LanguageSelection;
  readonly normalizedValue?: (result: LanguageJsonResult, value: string) => string;
}): PatternMatcher<LanguageEntityMetadata> {
  return (text, context) => {
    const view = options.select(languageDocument(text, context, options.lexicon));
    const results = view.json({
      offset: true,
      terms: { text: true, tags: true },
    }) as LanguageJsonResult[];

    return results.flatMap((result) => {
      const start = result.offset?.start;
      const length = result.offset?.length;
      if (!Number.isInteger(start) || !Number.isInteger(length) || length === undefined) return [];
      const end = trimTrailingPunctuation(text, start as number, (start as number) + length);
      if (end <= (start as number)) return [];
      const value = text.slice(start as number, end);
      const normalizedValue = options.normalizedValue?.(result, value);
      const details = options.category === "person"
        ? result.person
        : options.category === "money"
          ? result.money
          : undefined;
      return [{
        value,
        start: start as number,
        end,
        ...(normalizedValue === undefined ? {} : { normalizedValue }),
        metadata: {
          category: options.category,
          ...(details === undefined ? {} : { details }),
          ...(result.terms === undefined ? {} : { terms: result.terms }),
        },
      }];
    });
  };
}
