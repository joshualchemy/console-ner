import type { Entity } from "./Entity";

export interface TextToken {
  readonly type: "text";
  readonly value: string;
  readonly start: number;
  readonly end: number;
}

export interface EntityToken<TTag extends string = string, TMetadata = unknown> {
  readonly type: "entity";
  readonly tag: TTag;
  readonly value: string;
  readonly normalizedValue: string;
  readonly start: number;
  readonly end: number;
  readonly entity: Entity<TTag, TMetadata>;
}

export type Token<TTag extends string = string, TMetadata = unknown> =
  | TextToken
  | EntityToken<TTag, TMetadata>;

