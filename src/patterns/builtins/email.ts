import { regexPattern } from "../regexPattern";
import type { BuiltInPattern, BuiltInPatternOptions } from "./types";

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
