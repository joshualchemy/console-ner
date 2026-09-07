import type { RecognizerDefinition } from "../../types/Recognizer";
import {
  languagePatterns,
  type LanguageBuiltInTag,
  type LanguagePatternsOptions,
} from "./patterns";
import type { LanguageEntityMetadata, LanguageLexicon } from "./matcher";

export const LANGUAGE_RECOGNIZER_ID = "language";

export interface LanguageRecognizerOptions {
  readonly id?: string;
  readonly enabled?: boolean;
  readonly lexicon?: LanguageLexicon;
  readonly patternIdPrefix?: string;
  readonly allowOverlap?: boolean;
}

export function languageRecognizer<
  TAdditionalTag extends string = never,
  TServices = undefined,
  TAdditionalMetadata = never,
>(
  options: LanguageRecognizerOptions = {},
): RecognizerDefinition<
  LanguageBuiltInTag | TAdditionalTag,
  LanguageEntityMetadata | TAdditionalMetadata,
  TServices
> {
  const patternOptions: LanguagePatternsOptions = {
    ...(options.patternIdPrefix === undefined ? {} : { id: options.patternIdPrefix }),
    ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
    ...(options.allowOverlap === undefined ? {} : { allowOverlap: options.allowOverlap }),
  };
  return {
    id: options.id ?? LANGUAGE_RECOGNIZER_ID,
    enabled: options.enabled ?? true,
    patterns: languagePatterns(patternOptions),
  };
}
