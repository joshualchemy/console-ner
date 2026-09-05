import nlp from "compromise";
import type View from "compromise/view/three";
import type { PatternMatcher, RecognitionContext } from "../../types/Pattern";
import type { BuiltInPatternOptions } from "./types";

export type CompromiseLexicon = Readonly<Record<string, string>>;

export interface CompromiseBuiltInPatternOptions<TTag extends string>
  extends BuiltInPatternOptions<TTag> {
  readonly lexicon?: CompromiseLexicon;
}

export interface CompromiseEntityMetadata {
  readonly engine: "compromise";
  readonly selection: "money" | "organization" | "person" | "place";
  readonly details?: Readonly<Record<string, unknown>>;
  readonly terms?: readonly Readonly<{
    text?: string;
    tags?: readonly string[];
  }>[];
}

interface CompromiseJsonResult {
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

interface CompromiseSelection {
  json(options: {
    readonly offset: true;
    readonly terms: { readonly text: true; readonly tags: true };
  }): unknown;
}

const defaultDocumentKey = Symbol("console-ner:compromise-document");
const lexiconDocumentKeys = new WeakMap<object, symbol>();

function documentKey(lexicon?: CompromiseLexicon): symbol {
  if (!lexicon) return defaultDocumentKey;
  const existing = lexiconDocumentKeys.get(lexicon);
  if (existing) return existing;
  const key = Symbol("console-ner:compromise-document-with-lexicon");
  lexiconDocumentKeys.set(lexicon, key);
  return key;
}

function compromiseDocument(
  text: string,
  context: RecognitionContext,
  lexicon?: CompromiseLexicon,
): View {
  return context.memoize(documentKey(lexicon), () =>
    nlp(text, lexicon ? { ...lexicon } : undefined),
  );
}

function trimTrailingPunctuation(text: string, start: number, end: number): number {
  while (end > start && /[.,;:!?]/u.test(text[end - 1] ?? "")) end -= 1;
  return end;
}

export function compromiseMatcher(options: {
  readonly selection: CompromiseEntityMetadata["selection"];
  readonly lexicon?: CompromiseLexicon;
  readonly select: (document: View) => CompromiseSelection;
  readonly normalizedValue?: (result: CompromiseJsonResult, value: string) => string;
}): PatternMatcher<CompromiseEntityMetadata> {
  return (text, context) => {
    const view = options.select(compromiseDocument(text, context, options.lexicon));
    const results = view.json({
      offset: true,
      terms: { text: true, tags: true },
    }) as CompromiseJsonResult[];

    return results.flatMap((result) => {
      const start = result.offset?.start;
      const length = result.offset?.length;
      if (!Number.isInteger(start) || !Number.isInteger(length) || length === undefined) return [];
      const end = trimTrailingPunctuation(text, start as number, (start as number) + length);
      if (end <= (start as number)) return [];
      const value = text.slice(start as number, end);
      const normalizedValue = options.normalizedValue?.(result, value);
      const details = options.selection === "person"
        ? result.person
        : options.selection === "money"
          ? result.money
          : undefined;
      return [{
        value,
        start: start as number,
        end,
        ...(normalizedValue === undefined ? {} : { normalizedValue }),
        metadata: {
          engine: "compromise" as const,
          selection: options.selection,
          ...(details === undefined ? {} : { details }),
          ...(result.terms === undefined ? {} : { terms: result.terms }),
        },
      }];
    });
  };
}
