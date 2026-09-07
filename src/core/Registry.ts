import type { EntityPattern } from "../types/Pattern";
import type { RecognizerDefinition, RecognizerInfo } from "../types/Recognizer";

export interface RegisteredPattern<
  TTag extends string,
  TMetadata,
  TServices,
> extends EntityPattern<TTag, TMetadata, TServices> {
  readonly id: string;
  readonly registrationOrder: number;
  readonly recognizerId?: string;
  enabled: boolean;
}

interface RegisteredRecognizer {
  readonly id: string;
  enabled: boolean;
  patternIds: string[];
}

export class Registry<TTag extends string, TMetadata, TServices> {
  readonly #patterns = new Map<string, RegisteredPattern<TTag, TMetadata, TServices>>();
  readonly #recognizers = new Map<string, RegisteredRecognizer>();
  #nextRegistration = 0;
  #nextPatternId = 0;

  register(pattern: EntityPattern<TTag, TMetadata, TServices>): string {
    return this.registerMany([pattern])[0] as string;
  }

  registerMany(
    patterns: readonly EntityPattern<TTag, TMetadata, TServices>[],
    recognizerId?: string,
  ): string[] {
    const startOrder = this.#nextRegistration;
    const batchIds = new Set<string>();
    let nextPatternId = this.#nextPatternId;
    const entries = patterns.map((pattern, index) => {
      let id = pattern.id;
      if (id === undefined) {
        do id = `pattern-${nextPatternId++}`;
        while (this.#patterns.has(id) || batchIds.has(id));
      }
      if (this.#patterns.has(id) || batchIds.has(id)) {
        throw new Error(`A pattern with id "${id}" is already registered.`);
      }
      batchIds.add(id);
      return { pattern, order: startOrder + index, id };
    });

    for (const { pattern, order, id } of entries) {
      this.#patterns.set(id, {
        ...pattern,
        id,
        enabled: pattern.enabled ?? true,
        registrationOrder: order,
        ...(recognizerId === undefined ? {} : { recognizerId }),
      });
    }
    this.#nextRegistration += entries.length;
    this.#nextPatternId = nextPatternId;
    return entries.map(({ id }) => id);
  }

  registerRecognizer(
    recognizer: RecognizerDefinition<TTag, TMetadata, TServices>,
  ): string {
    if (this.#recognizers.has(recognizer.id)) {
      throw new Error(`A recognizer with id "${recognizer.id}" is already registered.`);
    }
    if (recognizer.patterns.length === 0) {
      throw new Error(`Recognizer "${recognizer.id}" must contain at least one pattern.`);
    }
    const patternIds = this.registerMany(recognizer.patterns, recognizer.id);
    this.#recognizers.set(recognizer.id, {
      id: recognizer.id,
      enabled: recognizer.enabled ?? true,
      patternIds,
    });
    return recognizer.id;
  }

  get(id: string): RegisteredPattern<TTag, TMetadata, TServices> | undefined {
    return this.#patterns.get(id);
  }

  all(): readonly RegisteredPattern<TTag, TMetadata, TServices>[] {
    return [...this.#patterns.values()];
  }

  active(): readonly RegisteredPattern<TTag, TMetadata, TServices>[] {
    return this.all().filter((pattern) => {
      if (!pattern.enabled) return false;
      if (pattern.recognizerId === undefined) return true;
      return this.#recognizers.get(pattern.recognizerId)?.enabled === true;
    });
  }

  recognizers(): readonly RecognizerInfo[] {
    return [...this.#recognizers.values()].map(({ id, enabled, patternIds }) => ({
      id,
      enabled,
      patternIds: [...patternIds],
    }));
  }

  unregisterPattern(id: string): boolean {
    const pattern = this.#patterns.get(id);
    if (!pattern || !this.#patterns.delete(id)) return false;
    if (pattern.recognizerId !== undefined) {
      const recognizer = this.#recognizers.get(pattern.recognizerId);
      if (recognizer) recognizer.patternIds = recognizer.patternIds.filter((item) => item !== id);
    }
    return true;
  }

  unregisterTag(tag: TTag): number {
    let removed = 0;
    for (const [id, pattern] of this.#patterns) {
      if (pattern.tag === tag) {
        this.unregisterPattern(id);
        removed++;
      }
    }
    return removed;
  }

  setEnabled(id: string, enabled: boolean): boolean {
    const pattern = this.#patterns.get(id);
    if (!pattern) return false;
    pattern.enabled = enabled;
    return true;
  }

  setRecognizerEnabled(id: string, enabled: boolean): boolean {
    const recognizer = this.#recognizers.get(id);
    if (!recognizer) return false;
    recognizer.enabled = enabled;
    return true;
  }

  unregisterRecognizer(id: string): boolean {
    const recognizer = this.#recognizers.get(id);
    if (!recognizer) return false;
    for (const patternId of recognizer.patternIds) this.#patterns.delete(patternId);
    this.#recognizers.delete(id);
    return true;
  }

  clear(): void {
    this.#patterns.clear();
    this.#recognizers.clear();
  }
}
