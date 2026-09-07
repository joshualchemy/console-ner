import { regexPattern } from "../regexPattern";
import type { BuiltInPattern, BuiltInPatternOptions } from "./types";

export function moneyPattern(
  options?: Omit<BuiltInPatternOptions<"money">, "tag"> & { readonly tag?: "money" },
): BuiltInPattern<"money">;
export function moneyPattern<TTag extends string>(
  options: BuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag>;
export function moneyPattern(
  options: BuiltInPatternOptions<string> = {},
): BuiltInPattern<string> {
  return regexPattern({
    id: options.id ?? "builtin-money-usd",
    tag: options.tag ?? "money",
    regex: /(?<!\w)\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?(?!\w)/g,
    confidence: options.confidence ?? 0.94,
    priority: options.priority ?? 0,
    normalize: (value) => value.replace(/[$,]/g, ""),
  });
}
