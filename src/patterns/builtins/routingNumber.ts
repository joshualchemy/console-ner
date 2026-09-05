import type { BuiltInPattern, BuiltInPatternOptions } from "./types";
import { capturedPattern, digits } from "./utilities";

function passesRoutingChecksum(value: string): boolean {
  const sequence = digits(value);
  if (sequence.length !== 9) return false;
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1];
  return [...sequence].reduce(
    (sum, digit, index) => sum + Number(digit) * (weights[index] ?? 0),
    0,
  ) % 10 === 0;
}

export function routingNumberPattern(
  options?: Omit<BuiltInPatternOptions<"routing_number">, "tag"> & {
    readonly tag?: "routing_number";
  },
): BuiltInPattern<"routing_number">;
export function routingNumberPattern<TTag extends string>(
  options: BuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag>;
export function routingNumberPattern(
  options: BuiltInPatternOptions<string> = {},
): BuiltInPattern<string> {
  return {
    id: options.id ?? "builtin-routing-number",
    tag: options.tag ?? "routing_number",
    pattern: capturedPattern(/(?<!\d)\d{9}(?!\d)/g, 0, passesRoutingChecksum),
    confidence: options.confidence ?? 0.96,
    priority: options.priority ?? 0,
    normalize: digits,
  };
}
