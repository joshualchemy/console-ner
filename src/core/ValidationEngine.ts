import type { Entity } from "../types/Entity";
import type { RecognitionResult } from "../types/Recognition";
import type {
  GlobalValidatorDefinition,
  ValidationErrorContext,
  ValidationInput,
  ValidationOptions,
  ValidationContext,
} from "../types/Validation";
import { mapConcurrent } from "../utilities/concurrency";
import { mergeMetadata } from "../utilities/metadata";
import { isValidRange } from "../utilities/ranges";
import { clampConfidence, confidenceThreshold } from "../utilities/scoring";
import type { Registry } from "./Registry";

export interface ValidationEngineOptions<
  TTag extends string,
  TMetadata,
  TServices,
  TResultMetadata,
> {
  readonly concurrency: number;
  readonly defaultValidatorThreshold: number;
  readonly validator?: GlobalValidatorDefinition<TTag, TMetadata, TServices, TResultMetadata>;
  readonly onValidationError?: (
    error: unknown,
    context: ValidationErrorContext<TTag, TMetadata>,
  ) => void;
}

function isAbort(error: unknown, signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true ||
    (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError");
}

function cloneMetadata<T>(metadata: T | undefined): T | undefined {
  if (Array.isArray(metadata)) return [...metadata] as T;
  if (typeof metadata === "object" && metadata !== null) return { ...metadata };
  return metadata;
}

function cloneEntity<TTag extends string, TMetadata>(
  entity: Entity<TTag, TMetadata>,
): Entity<TTag, TMetadata> {
  const { metadata, validation, ...rest } = entity;
  return {
    ...rest,
    ...(metadata === undefined ? {} : { metadata: cloneMetadata(metadata) as TMetadata }),
    ...(validation === undefined ? {} : { validation: { ...validation } }),
    confidence: clampConfidence(entity.confidence),
  };
}

export class ValidationEngine<
  TTag extends string,
  TMetadata,
  TServices,
  TResultMetadata,
> {
  constructor(
    private readonly registry: Registry<TTag, TMetadata, TServices>,
    private readonly settings: ValidationEngineOptions<
      TTag,
      TMetadata,
      TServices,
      TResultMetadata
    >,
  ) {}

  async validate(
    recognition: RecognitionResult<TTag, TMetadata, TResultMetadata>,
    input: ValidationInput<TServices> | undefined,
    options: ValidationOptions | undefined,
  ): Promise<RecognitionResult<TTag, TMetadata, TResultMetadata>> {
    const services = input?.services as TServices;
    const context: ValidationContext<TServices, TTag> = {
      services,
      text: recognition.text,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
      recognitionOptions: recognition.recognitionOptions ?? {},
    };

    const entities = await mapConcurrent(
      recognition.entities.map(cloneEntity),
      this.settings.concurrency,
      async (entity) => this.#validateEntity(entity, context),
    );

    const { metadata, ...recognitionWithoutMetadata } = recognition;
    const afterEntities: RecognitionResult<TTag, TMetadata, TResultMetadata> = {
      ...recognitionWithoutMetadata,
      entities,
      ...(metadata === undefined
        ? {}
        : { metadata: cloneMetadata(metadata) as TResultMetadata }),
      validation: { global: { status: "not_requested" } },
    };
    return this.#validateGlobal(afterEntities, context);
  }

  async #validateEntity(
    entity: Entity<TTag, TMetadata>,
    context: ValidationContext<TServices, TTag>,
  ): Promise<Entity<TTag, TMetadata>> {
    const validator = entity.patternId
      ? this.registry.get(entity.patternId)?.validator
      : undefined;
    if (!validator) return { ...entity, validation: { status: "not_requested" } };

    const validatorId = validator.id ?? `${entity.patternId}:validator`;
    const threshold = confidenceThreshold(
      validator.runBelowConfidence,
      this.settings.defaultValidatorThreshold,
    );
    if (entity.confidence >= threshold) {
      return {
        ...entity,
        validation: { status: "skipped", validatorId, reason: "confidence_threshold" },
      };
    }
    if (context.signal?.aborted) {
      return { ...entity, validation: { status: "aborted", validatorId } };
    }

    try {
      const update = await validator.validate(Object.freeze({ ...entity }), context);
      const valid = update.valid !== false;
      const mergedMetadata = mergeMetadata(entity.metadata, update.metadata);
      const { metadata: _metadata, ...entityWithoutMetadata } = entity;
      return {
        ...entityWithoutMetadata,
        normalizedValue: update.normalizedValue ?? entity.normalizedValue,
        confidence: clampConfidence(update.confidence ?? (valid ? entity.confidence : 0)),
        ...(mergedMetadata === undefined ? {} : { metadata: mergedMetadata }),
        validation: { status: valid ? "valid" : "invalid", validatorId },
      };
    } catch (error) {
      const aborted = isAbort(error, context.signal);
      if (!aborted) this.#reportError(error, { phase: "entity", validatorId, entity });
      return {
        ...entity,
        validation: { status: aborted ? "aborted" : "error", validatorId },
      };
    }
  }

  async #validateGlobal(
    recognition: RecognitionResult<TTag, TMetadata, TResultMetadata>,
    context: ValidationContext<TServices, TTag>,
  ): Promise<RecognitionResult<TTag, TMetadata, TResultMetadata>> {
    const validator = this.settings.validator;
    if (!validator) return recognition;

    const validatorId = validator.id ?? "global-validator";
    const threshold = confidenceThreshold(
      validator.runBelowConfidence,
      this.settings.defaultValidatorThreshold,
    );
    const eligible =
      recognition.entities.length === 0
        ? validator.runOnEmpty === true
        : recognition.entities.some((entity) => entity.confidence < threshold);
    if (!eligible) {
      return {
        ...recognition,
        validation: {
          global: {
            status: "skipped",
            validatorId,
            reason:
              recognition.entities.length === 0 ? "empty_result" : "confidence_threshold",
          },
        },
      };
    }
    if (context.signal?.aborted) {
      return {
        ...recognition,
        validation: { global: { status: "aborted", validatorId } },
      };
    }

    try {
      const input = Object.freeze({
        ...recognition,
        entities: Object.freeze(recognition.entities.map((entity) => Object.freeze(cloneEntity(entity)))),
      });
      const update = await validator.validate(input, context);
      const proposed = update?.entities ?? recognition.entities;
      const entities = proposed
        .filter(
          (entity) =>
            isValidRange(recognition.text, entity.start, entity.end) &&
            recognition.text.slice(entity.start, entity.end) === entity.value,
        )
        .map(cloneEntity);
      const { metadata: previousMetadata, ...recognitionWithoutMetadata } = recognition;
      const resultMetadata = update?.metadata ?? previousMetadata;

      return {
        ...recognitionWithoutMetadata,
        entities,
        ...(resultMetadata === undefined
          ? {}
          : { metadata: cloneMetadata(resultMetadata) as TResultMetadata }),
        validation: { global: { status: "completed", validatorId } },
      };
    } catch (error) {
      const aborted = isAbort(error, context.signal);
      if (!aborted) this.#reportError(error, { phase: "global", validatorId });
      return {
        ...recognition,
        validation: { global: { status: aborted ? "aborted" : "error", validatorId } },
      };
    }
  }

  #reportError(error: unknown, context: ValidationErrorContext<TTag, TMetadata>): void {
    try {
      this.settings.onValidationError?.(error, context);
    } catch {
      // Error hooks are observational and must not break recognition.
    }
  }
}
