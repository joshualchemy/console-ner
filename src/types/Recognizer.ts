import type { EntityPattern } from "./Pattern";

/** A named group of patterns that can be managed as one recognizer. */
export interface RecognizerDefinition<
  TTag extends string = string,
  TMetadata = unknown,
  TServices = undefined,
> {
  readonly id: string;
  readonly patterns: readonly EntityPattern<TTag, TMetadata, TServices>[];
  readonly enabled?: boolean;
}

/** Read-only registry information for a configured recognizer. */
export interface RecognizerInfo {
  readonly id: string;
  readonly enabled: boolean;
  readonly patternIds: readonly string[];
}
