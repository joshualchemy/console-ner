import type { EntityValidationState } from "./Validation";

/** A recognized span. Positions use JavaScript's `[start, end)` string indexes. */
export interface Entity<TTag extends string = string, TMetadata = unknown> {
  readonly id: string;
  readonly tag: TTag;
  readonly value: string;
  readonly normalizedValue: string;
  readonly start: number;
  readonly end: number;
  readonly confidence: number;
  readonly metadata?: TMetadata;
  readonly source: string;
  readonly patternId?: string;
  readonly validation?: EntityValidationState;
}

