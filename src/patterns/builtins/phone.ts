import {
  findPhoneNumbersInText,
  type CountryCode,
} from "libphonenumber-js/min/es6";
import type { PatternMatcher } from "../../types/Pattern";
import type { BuiltInPattern, BuiltInPatternOptions } from "./types";

export interface PhoneEntityMetadata {
  readonly category: "phone";
  readonly country?: CountryCode;
  readonly countryCallingCode: string;
  readonly nationalNumber: string;
  readonly possible: boolean;
  readonly valid: boolean;
  readonly international: string;
  readonly national: string;
  readonly uri: string;
  readonly extension?: string;
}

export interface PhonePatternOptions<TTag extends string>
  extends BuiltInPatternOptions<TTag> {
  /** Country used to interpret phone numbers without an international calling code. */
  readonly defaultCountry?: CountryCode;
  /** Calling code used when a country cannot be selected ahead of time. */
  readonly defaultCallingCode?: string;
  /** Enable the underlying parser's more permissive candidate search. */
  readonly extended?: boolean;
}

function isEmbeddedInIdentifier(text: string, start: number, end: number): boolean {
  const before = text[start - 1] ?? "";
  const after = text[end] ?? "";
  return /[\p{L}\p{N}_-]/u.test(before) || /[\p{L}\p{N}_-]/u.test(after);
}

export function phonePattern(
  options?: Omit<PhonePatternOptions<"phone">, "tag"> & { readonly tag?: "phone" },
): BuiltInPattern<"phone", PhoneEntityMetadata>;
export function phonePattern<TTag extends string>(
  options: PhonePatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag, PhoneEntityMetadata>;
export function phonePattern(
  options: PhonePatternOptions<string> = {},
): BuiltInPattern<string, PhoneEntityMetadata> {
  const searchOptions = {
    ...(options.defaultCallingCode === undefined || options.defaultCountry !== undefined
      ? { defaultCountry: options.defaultCountry ?? "US" }
      : {}),
    ...(options.defaultCallingCode === undefined
      ? {}
      : { defaultCallingCode: options.defaultCallingCode }),
    ...(options.extended === undefined ? {} : { extended: options.extended }),
  } satisfies {
    defaultCountry?: CountryCode;
    defaultCallingCode?: string;
    extended?: boolean;
  };
  const matcher: PatternMatcher<PhoneEntityMetadata> = (text) =>
    findPhoneNumbersInText(text, searchOptions)
      .filter(({ startsAt, endsAt }) => !isEmbeddedInIdentifier(text, startsAt, endsAt))
      .map(({ startsAt, endsAt, number }) => ({
        value: text.slice(startsAt, endsAt),
        start: startsAt,
        end: endsAt,
        normalizedValue: number.number,
        metadata: {
          category: "phone",
          ...(number.country === undefined ? {} : { country: number.country }),
          countryCallingCode: number.countryCallingCode,
          nationalNumber: number.nationalNumber,
          possible: number.isPossible(),
          valid: number.isValid(),
          international: number.formatInternational(),
          national: number.formatNational(),
          uri: number.getURI(),
          ...(number.ext === undefined ? {} : { extension: number.ext }),
        },
      }));

  return {
    id: options.id ?? "builtin-phone",
    tag: options.tag ?? "phone",
    pattern: matcher,
    confidence: options.confidence ?? 0.96,
    priority: options.priority ?? 0,
  };
}
