import type { EntityPattern, RegexPatternOptions } from "../types/Pattern";

export function regexPattern<
  TTag extends string,
  TMetadata = unknown,
  TServices = undefined,
>(
  options: RegexPatternOptions<TTag, TMetadata, TServices>,
): EntityPattern<TTag, TMetadata, TServices> {
  const { regex, ...definition } = options;
  return { ...definition, pattern: regex };
}

