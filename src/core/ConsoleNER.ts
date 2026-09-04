import type { Entity } from "../types/Entity";
import type { EntityPattern } from "../types/Pattern";
import type { RecognitionOptions, RecognitionResult } from "../types/Recognition";
import type { Token } from "../types/Token";
import type {
  GlobalValidatorDefinition,
  ValidationArguments,
  ValidationErrorContext,
  ValidationInput,
  ValidationOptions,
} from "../types/Validation";
import { clampConfidence } from "../utilities/scoring";
import { Registry } from "./Registry";
import { resolveOverlaps } from "./Resolver";
import { scan } from "./Scanner";
import { ValidationEngine } from "./ValidationEngine";

export interface ConsoleNEROptions<
  TTag extends string = string,
  TServices = undefined,
  TEntityMetadata = unknown,
  TResultMetadata = unknown,
> {
  readonly contextWindow?: number;
  readonly validationConcurrency?: number;
  readonly defaultConfidence?: number;
  readonly defaultValidatorThreshold?: number;
  readonly validator?: GlobalValidatorDefinition<
    TTag,
    TEntityMetadata,
    TServices,
    TResultMetadata
  >;
  readonly onValidationError?: (
    error: unknown,
    context: ValidationErrorContext<TTag, TEntityMetadata>,
  ) => void;
}

/** Deterministic entity recognition with optional confidence-aware async validation. */
export class ConsoleNER<
  TTag extends string = string,
  TServices = undefined,
  TEntityMetadata = unknown,
  TResultMetadata = unknown,
> {
  readonly #registry = new Registry<TTag, TEntityMetadata, TServices>();
  readonly #contextWindow: number;
  readonly #defaultConfidence: number;
  readonly #validation: ValidationEngine<TTag, TEntityMetadata, TServices, TResultMetadata>;

  constructor(options: ConsoleNEROptions<TTag, TServices, TEntityMetadata, TResultMetadata> = {}) {
    this.#contextWindow = Math.max(0, Math.floor(options.contextWindow ?? 100));
    this.#defaultConfidence = clampConfidence(options.defaultConfidence ?? 0.5);
    this.#validation = new ValidationEngine(this.#registry, {
      concurrency: Math.max(1, Math.floor(options.validationConcurrency ?? 6)),
      defaultValidatorThreshold: clampConfidence(options.defaultValidatorThreshold ?? 1),
      ...(options.validator === undefined ? {} : { validator: options.validator }),
      ...(options.onValidationError === undefined
        ? {}
        : { onValidationError: options.onValidationError }),
    });
  }

  register(
    definition:
      | EntityPattern<TTag, TEntityMetadata, TServices>
      | readonly EntityPattern<TTag, TEntityMetadata, TServices>[],
  ): this {
    const definitions = Array.isArray(definition) ? definition : [definition];
    for (const pattern of definitions) this.#registry.register(pattern);
    return this;
  }

  unregisterPattern(id: string): boolean {
    return this.#registry.unregisterPattern(id);
  }

  unregisterTag(tag: TTag): number {
    return this.#registry.unregisterTag(tag);
  }

  enablePattern(id: string): boolean {
    return this.#registry.setEnabled(id, true);
  }

  disablePattern(id: string): boolean {
    return this.#registry.setEnabled(id, false);
  }

  clear(): void {
    this.#registry.clear();
  }

  recognize(
    text: string,
    options: RecognitionOptions<TTag> = {},
  ): RecognitionResult<TTag, TEntityMetadata, TResultMetadata> {
    const included = options.tags === undefined ? undefined : new Set<TTag>(options.tags);
    const excluded = options.excludeTags === undefined ? undefined : new Set<TTag>(options.excludeTags);
    const patterns = this.#registry
      .all()
      .filter(
        (pattern) =>
          (included === undefined || included.has(pattern.tag)) &&
          (excluded === undefined || !excluded.has(pattern.tag)),
      );
    const candidates = scan(text, patterns, this.#contextWindow, this.#defaultConfidence);
    const entities = resolveOverlaps(candidates).map<Entity<TTag, TEntityMetadata>>(
      ({ priority: _priority, allowOverlap: _allowOverlap, registrationOrder: _order, ...entity }) =>
        entity,
    );

    return {
      text,
      entities,
      recognitionOptions: {
        ...(options.tags === undefined ? {} : { tags: [...options.tags] }),
        ...(options.excludeTags === undefined ? {} : { excludeTags: [...options.excludeTags] }),
      },
      validation: { global: { status: "not_requested" } },
    };
  }

  validate(
    recognition: RecognitionResult<TTag, TEntityMetadata, TResultMetadata>,
    ...args: ValidationArguments<TServices>
  ): Promise<RecognitionResult<TTag, TEntityMetadata, TResultMetadata>> {
    const [context, options] = args as [
      ValidationInput<TServices> | undefined,
      ValidationOptions | undefined,
    ];
    return this.#validation.validate(recognition, context, options);
  }

  recognizeAsync(
    text: string,
    ...args: ValidationArguments<TServices>
  ): Promise<RecognitionResult<TTag, TEntityMetadata, TResultMetadata>> {
    const [context, options] = args as [
      ValidationInput<TServices> | undefined,
      ValidationOptions | undefined,
    ];
    return this.#validation.validate(this.recognize(text), context, options);
  }

  tokenize(
    recognition: RecognitionResult<TTag, TEntityMetadata, TResultMetadata>,
  ): Token<TTag, TEntityMetadata>[] {
    const sorted = [...recognition.entities].sort(
      (left, right) =>
        left.start - right.start ||
        right.end - right.start - (left.end - left.start) ||
        right.confidence - left.confidence ||
        left.id.localeCompare(right.id),
    );
    const tokens: Token<TTag, TEntityMetadata>[] = [];
    let cursor = 0;
    for (const entity of sorted) {
      if (entity.start < cursor) continue;
      if (entity.start > cursor) {
        tokens.push({
          type: "text",
          value: recognition.text.slice(cursor, entity.start),
          start: cursor,
          end: entity.start,
        });
      }
      tokens.push({
        type: "entity",
        tag: entity.tag,
        value: entity.value,
        normalizedValue: entity.normalizedValue,
        start: entity.start,
        end: entity.end,
        entity,
      });
      cursor = entity.end;
    }
    if (cursor < recognition.text.length) {
      tokens.push({
        type: "text",
        value: recognition.text.slice(cursor),
        start: cursor,
        end: recognition.text.length,
      });
    }
    return tokens;
  }
}
