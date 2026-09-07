import type { EntityPattern } from "../../types/Pattern";

export interface BuiltInPatternOptions<TTag extends string> {
  readonly id?: string;
  readonly tag?: TTag;
  readonly confidence?: number;
  readonly priority?: number;
}

export type BuiltInPattern<TTag extends string, TMetadata = never> = Omit<
  EntityPattern<TTag, TMetadata, never>,
  "confidence" | "validator"
> & {
  /** Built-ins use a fixed score and never require application services. */
  readonly confidence?: number;
};
