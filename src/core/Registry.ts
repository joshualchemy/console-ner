import type { EntityPattern } from "../types/Pattern";

export interface RegisteredPattern<
  TTag extends string,
  TMetadata,
  TServices,
> extends EntityPattern<TTag, TMetadata, TServices> {
  readonly id: string;
  readonly registrationOrder: number;
  enabled: boolean;
}

export class Registry<TTag extends string, TMetadata, TServices> {
  readonly #patterns = new Map<string, RegisteredPattern<TTag, TMetadata, TServices>>();
  #nextRegistration = 0;

  register(pattern: EntityPattern<TTag, TMetadata, TServices>): string {
    const order = this.#nextRegistration++;
    const id = pattern.id ?? `pattern-${order}`;
    if (this.#patterns.has(id)) throw new Error(`A pattern with id "${id}" is already registered.`);

    this.#patterns.set(id, {
      ...pattern,
      id,
      enabled: pattern.enabled ?? true,
      registrationOrder: order,
    });
    return id;
  }

  get(id: string): RegisteredPattern<TTag, TMetadata, TServices> | undefined {
    return this.#patterns.get(id);
  }

  all(): readonly RegisteredPattern<TTag, TMetadata, TServices>[] {
    return [...this.#patterns.values()];
  }

  unregisterPattern(id: string): boolean {
    return this.#patterns.delete(id);
  }

  unregisterTag(tag: TTag): number {
    let removed = 0;
    for (const [id, pattern] of this.#patterns) {
      if (pattern.tag === tag) {
        this.#patterns.delete(id);
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

  clear(): void {
    this.#patterns.clear();
  }
}

