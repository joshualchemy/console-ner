import { regexPattern } from "../regexPattern";
import type { BuiltInPattern, BuiltInPatternOptions } from "./types";

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
