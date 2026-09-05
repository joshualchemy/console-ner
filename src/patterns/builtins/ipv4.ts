import type { BuiltInPattern, BuiltInPatternOptions } from "./types";
import { capturedPattern } from "./utilities";

function isValidIpv4(value: string): boolean {
  const octets = value.split(".").map(Number);
  return octets.length === 4 && octets.every(
    (octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255,
  );
}

export function ipv4Pattern(
  options?: Omit<BuiltInPatternOptions<"ip_address">, "tag"> & {
    readonly tag?: "ip_address";
  },
): BuiltInPattern<"ip_address">;
export function ipv4Pattern<TTag extends string>(
  options: BuiltInPatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag>;
export function ipv4Pattern(
  options: BuiltInPatternOptions<string> = {},
): BuiltInPattern<string> {
  return {
    id: options.id ?? "builtin-ipv4",
    tag: options.tag ?? "ip_address",
    pattern: capturedPattern(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, 0, isValidIpv4),
    confidence: options.confidence ?? 0.96,
    priority: options.priority ?? 0,
  };
}
