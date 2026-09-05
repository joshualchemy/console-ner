import type { BuiltInPattern, BuiltInPatternOptions } from "./types";
import { capturedPattern, digits } from "./utilities";

function passesLuhn(value: string): boolean {
  const sequence = digits(value);
  if (sequence.length < 13 || sequence.length > 19 || /^(\d)\1+$/.test(sequence)) return false;
  let sum = 0;
  let double = false;
  for (let index = sequence.length - 1; index >= 0; index--) {
    let digit = Number(sequence[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function paymentCardPattern(
  options?: Omit<BuiltInPatternOptions<"payment_card">, "tag"> & {
    readonly tag?: "payment_card";
  },
): BuiltInPattern<"payment_card">;
export function paymentCardPattern<TTag extends string>(
  options: BuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag>;
export function paymentCardPattern(
  options: BuiltInPatternOptions<string> = {},
): BuiltInPattern<string> {
  return {
    id: options.id ?? "builtin-payment-card",
    tag: options.tag ?? "payment_card",
    pattern: capturedPattern(/(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g, 0, passesLuhn),
    confidence: options.confidence ?? 0.96,
    priority: options.priority ?? 0,
    normalize: digits,
  };
}
