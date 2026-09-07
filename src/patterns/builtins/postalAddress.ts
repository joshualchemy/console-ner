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
    regex: /\b\d{1,6}\s+(?:[NSEW]\.?(?:\s+|$))?(?:[\p{L}][\p{L}\d.'-]*\s+){1,6}(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Pkwy|Parkway|Ct|Court|Cir|Circle|Pl|Place|Ter|Terrace|Hwy|Highway)\.?(?:\s+[NSEW]\.?)?,?\s+[\p{L}'-]+(?:\s+[\p{L}'-]+){0,3},\s*[A-Z]{2}\s+(?:\d{5}(?:-\d{4})?|[A-Z]\d[A-Z][ -]?\d[A-Z]\d)\b/giu,
    confidence: options.confidence ?? 0.62,
    priority: options.priority ?? 2,
    normalize: (value) => value.replace(/\s+/g, " ").trim(),
  });
}
