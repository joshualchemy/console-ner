import { ConsoleNER, type ConsoleNEROptions } from "../../core/ConsoleNER";
import type { RecognizerDefinition } from "../../types/Recognizer";
import {
  compromisePatterns,
  type CompromiseBuiltInTag,
  type CompromisePatternsOptions,
} from "./patterns";
import type { CompromiseEntityMetadata, CompromiseLexicon } from "./matcher";

export const COMPROMISE_RECOGNIZER_ID = "compromise";

export interface CompromiseRecognizerOptions {
  readonly id?: string;
  readonly enabled?: boolean;
  readonly lexicon?: CompromiseLexicon;
  readonly patternIdPrefix?: string;
}

export function compromiseRecognizer<
  TAdditionalTag extends string = never,
  TServices = undefined,
  TAdditionalMetadata = never,
>(
  options: CompromiseRecognizerOptions = {},
): RecognizerDefinition<
  CompromiseBuiltInTag | TAdditionalTag,
  CompromiseEntityMetadata | TAdditionalMetadata,
  TServices
> {
  const patternOptions: CompromisePatternsOptions = {
    ...(options.patternIdPrefix === undefined ? {} : { id: options.patternIdPrefix }),
    ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
  };
  return {
    id: options.id ?? COMPROMISE_RECOGNIZER_ID,
    enabled: options.enabled ?? true,
    patterns: compromisePatterns(patternOptions),
  };
}

export type CompromiseNEROptions<
  TAdditionalTag extends string = never,
  TServices = undefined,
  TAdditionalMetadata = never,
  TResultMetadata = unknown,
> = ConsoleNEROptions<
  CompromiseBuiltInTag | TAdditionalTag,
  TServices,
  CompromiseEntityMetadata | TAdditionalMetadata,
  TResultMetadata
> & {
  /** Register the bundled Compromise recognizer by default, customize it, or omit it. */
  readonly compromise?: false | CompromiseRecognizerOptions;
};

/** Create a ConsoleNER instance with the named Compromise recognizer registered by default. */
export function createCompromiseNER<
  TAdditionalTag extends string = never,
  TServices = undefined,
  TAdditionalMetadata = never,
  TResultMetadata = unknown,
>(
  options: CompromiseNEROptions<
    TAdditionalTag,
    TServices,
    TAdditionalMetadata,
    TResultMetadata
  > = {},
): ConsoleNER<
  CompromiseBuiltInTag | TAdditionalTag,
  TServices,
  CompromiseEntityMetadata | TAdditionalMetadata,
  TResultMetadata
> {
  const { compromise, ...coreOptions } = options;
  const ner = new ConsoleNER<
    CompromiseBuiltInTag | TAdditionalTag,
    TServices,
    CompromiseEntityMetadata | TAdditionalMetadata,
    TResultMetadata
  >(coreOptions);
  if (compromise !== false) {
    ner.registerRecognizer(
      compromiseRecognizer<TAdditionalTag, TServices, TAdditionalMetadata>(compromise),
    );
  }
  return ner;
}
