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
  readonly allowOverlap?: boolean;
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
    ...(options.allowOverlap === undefined ? {} : { allowOverlap: options.allowOverlap }),
  };
  return {
    id: options.id ?? COMPROMISE_RECOGNIZER_ID,
    enabled: options.enabled ?? true,
    patterns: compromisePatterns(patternOptions),
  };
}
