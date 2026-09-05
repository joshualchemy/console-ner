import { regexPattern } from "../regexPattern";
import type { BuiltInPattern, BuiltInPatternOptions } from "./types";

export function postalAddressPattern(
  options?: Omit<BuiltInPatternOptions<"postal_address">, "tag"> & {
    readonly tag?: "postal_address";
  },
): BuiltInPattern<"postal_address">;
export function postalAddressPattern<TTag extends string>(
  options: BuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag>;
export function postalAddressPattern(
  options: BuiltInPatternOptions<string> = {},
): BuiltInPattern<string> {
  return regexPattern({
    id: options.id ?? "builtin-us-postal-address",
    tag: options.tag ?? "postal_address",
    regex: /\b\d{1,6}\s+(?:[NSEW]\.?(?:\s+|$))?(?:[A-Z][\p{L}'-]*\s+){1,4}(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane)\.?,?\s+[A-Z][\p{L}'-]*(?:\s+[A-Z][\p{L}'-]*)*,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/gu,
    confidence: options.confidence ?? 0.62,
    priority: options.priority ?? 0,
    normalize: (value) => value.replace(/\s+/g, " ").trim(),
  });
}
