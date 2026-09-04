import type { EntityValidatorDefinition } from "./Validation";

export interface MatchContext {
  readonly text: string;
  readonly before: string;
  readonly after: string;
  readonly start: number;
  readonly end: number;
}

export interface RecognitionContext {
  readonly text: string;
}

export interface PatternMatch<TMetadata = unknown> {
  readonly value: string;
  readonly start: number;
  readonly end: number;
  readonly confidence?: number;
  readonly normalizedValue?: string;
  readonly metadata?: TMetadata;
}

export type PatternMatcher<TMetadata = unknown> = (
  text: string,
  context: RecognitionContext,
) => Iterable<PatternMatch<TMetadata>>;

export type ConfidenceResolver<TMetadata = unknown> = (
  value: string,
  context: MatchContext,
  match: Readonly<PatternMatch<TMetadata>>,
) => number;

export interface EntityPattern<
  TTag extends string = string,
  TMetadata = unknown,
  TServices = undefined,
> {
  readonly id?: string;
  readonly tag: TTag;
  readonly pattern: RegExp | PatternMatcher<TMetadata>;
  readonly confidence?: number | ConfidenceResolver<TMetadata>;
  readonly normalize?: (value: string, context: MatchContext) => string;
  readonly metadata?: (value: string, context: MatchContext) => TMetadata;
  readonly validator?: EntityValidatorDefinition<TTag, TMetadata, TServices>;
  readonly priority?: number;
  readonly allowOverlap?: boolean;
  readonly enabled?: boolean;
}

export interface RegexPatternOptions<
  TTag extends string = string,
  TMetadata = unknown,
  TServices = undefined,
> extends Omit<EntityPattern<TTag, TMetadata, TServices>, "pattern"> {
  readonly regex: RegExp;
}

