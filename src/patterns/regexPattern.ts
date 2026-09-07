import type { EntityPattern, RegexPatternOptions } from "../types/Pattern";

export function regexPattern<
  TTag extends string,
  TMetadata = unknown,
  TServices = undefined,
  const TOptions extends RegexPatternOptions<TTag, TMetadata, TServices> = RegexPatternOptions<
    TTag,
    TMetadata,
    TServices
  >,
>(
  options: TOptions,
): Omit<TOptions, "regex"> & Pick<EntityPattern<TTag, TMetadata, TServices>, "pattern"> {
  const { regex, ...definition } = options;
  return { ...definition, pattern: regex };
}
