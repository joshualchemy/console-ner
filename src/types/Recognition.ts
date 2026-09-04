import type { Entity } from "./Entity";
import type { ResultValidationState } from "./Validation";

export interface RecognitionOptions<TTag extends string = string> {
  readonly tags?: readonly TTag[];
  readonly excludeTags?: readonly TTag[];
}

export interface RecognitionResult<
  TTag extends string = string,
  TEntityMetadata = unknown,
  TResultMetadata = unknown,
> {
  readonly text: string;
  readonly entities: readonly Entity<TTag, TEntityMetadata>[];
  readonly metadata?: TResultMetadata;
  readonly recognitionOptions?: Readonly<RecognitionOptions<TTag>>;
  readonly validation?: ResultValidationState;
}

