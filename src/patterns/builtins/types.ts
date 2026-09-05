import type { EntityPattern } from "../../types/Pattern";

export interface BuiltInPatternOptions<TTag extends string> {
  readonly id?: string;
  readonly tag?: TTag;
  readonly confidence?: number;
  readonly priority?: number;
}

export type BuiltInPattern<TTag extends string> = Omit<
  EntityPattern<TTag, unknown, never>,
  "validator"
>;
