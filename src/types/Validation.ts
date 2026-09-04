import type { Entity } from "./Entity";
import type { RecognitionOptions, RecognitionResult } from "./Recognition";

export type EntityValidationStatus =
  | "not_requested"
  | "skipped"
  | "valid"
  | "invalid"
  | "error"
  | "aborted";

export interface EntityValidationState {
  readonly status: EntityValidationStatus;
  readonly validatorId?: string;
  readonly reason?: string;
}

export type GlobalValidationStatus =
  | "not_requested"
  | "skipped"
  | "completed"
  | "error"
  | "aborted";

export interface GlobalValidationState {
  readonly status: GlobalValidationStatus;
  readonly validatorId?: string;
  readonly reason?: string;
}

export interface ResultValidationState {
  readonly global: GlobalValidationState;
}

export interface ValidationContext<TServices = undefined, TTag extends string = string> {
  readonly services: TServices;
  readonly text: string;
  readonly signal?: AbortSignal;
  readonly recognitionOptions: Readonly<RecognitionOptions<TTag>>;
}

export type ValidationInput<TServices = undefined> = [TServices] extends [undefined]
  ? { readonly services?: TServices }
  : { readonly services: TServices };

export interface ValidationOptions {
  readonly signal?: AbortSignal;
}

export type ValidationArguments<TServices> = [TServices] extends [undefined]
  ? [context?: ValidationInput<TServices>, options?: ValidationOptions]
  : [context: ValidationInput<TServices>, options?: ValidationOptions];

export interface EntityValidationResult<TMetadata = unknown> {
  readonly valid?: boolean;
  readonly confidence?: number;
  readonly normalizedValue?: string;
  readonly metadata?: Partial<TMetadata>;
}

export interface EntityValidatorDefinition<
  TTag extends string = string,
  TMetadata = unknown,
  TServices = undefined,
> {
  readonly id?: string;
  readonly runBelowConfidence?: number;
  readonly validate: (
    entity: Readonly<Entity<TTag, TMetadata>>,
    context: ValidationContext<TServices, TTag>,
  ) => EntityValidationResult<TMetadata> | Promise<EntityValidationResult<TMetadata>>;
}

export interface GlobalValidationResult<
  TTag extends string = string,
  TEntityMetadata = unknown,
  TResultMetadata = unknown,
> {
  readonly entities?: readonly Entity<TTag, TEntityMetadata>[];
  readonly metadata?: TResultMetadata;
}

export interface GlobalValidatorDefinition<
  TTag extends string = string,
  TEntityMetadata = unknown,
  TServices = undefined,
  TResultMetadata = unknown,
> {
  readonly id?: string;
  readonly runBelowConfidence?: number;
  readonly runOnEmpty?: boolean;
  readonly validate: (
    result: Readonly<RecognitionResult<TTag, TEntityMetadata, TResultMetadata>>,
    context: ValidationContext<TServices, TTag>,
  ) =>
    | GlobalValidationResult<TTag, TEntityMetadata, TResultMetadata>
    | Promise<GlobalValidationResult<TTag, TEntityMetadata, TResultMetadata>>;
}

export interface ValidationErrorContext<
  TTag extends string = string,
  TMetadata = unknown,
> {
  readonly phase: "entity" | "global";
  readonly validatorId?: string;
  readonly entity?: Entity<TTag, TMetadata>;
}
