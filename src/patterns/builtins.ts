import type { EntityPattern } from "../types/Pattern";
import { regexPattern } from "./regexPattern";

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

export function emailPattern(
  options?: Omit<BuiltInPatternOptions<"email">, "tag"> & { readonly tag?: "email" },
): BuiltInPattern<"email">;
export function emailPattern<TTag extends string>(
  options: BuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag>;
export function emailPattern(
  options: BuiltInPatternOptions<string> = {},
): BuiltInPattern<string> {
  return regexPattern({
    id: options.id ?? "builtin-email",
    tag: options.tag ?? "email",
    regex: /\b[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+\b/gi,
    confidence: options.confidence ?? 0.99,
    priority: options.priority ?? 0,
    normalize: (value) => value.toLowerCase(),
  });
}

export function phonePattern(
  options?: Omit<BuiltInPatternOptions<"phone">, "tag"> & { readonly tag?: "phone" },
): BuiltInPattern<"phone">;
export function phonePattern<TTag extends string>(
  options: BuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag>;
export function phonePattern(
  options: BuiltInPatternOptions<string> = {},
): BuiltInPattern<string> {
  return regexPattern({
    id: options.id ?? "builtin-phone",
    tag: options.tag ?? "phone",
    regex: /(?<!\w)(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]\d{3}[ .-]\d{4}(?!\w)/g,
    confidence: options.confidence ?? 0.92,
    priority: options.priority ?? 0,
    normalize: (value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length === 10 ? `+1${digits}` : `+${digits}`;
    },
  });
}
