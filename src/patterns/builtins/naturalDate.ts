import {
  casual,
  strict,
  type Component,
  type ParsedResult,
  type ParsingReference,
} from "chrono-node";
import type { PatternMatcher } from "../../types/Pattern";
import type { BuiltInPattern, BuiltInPatternOptions } from "./types";

export interface NaturalDateEntityMetadata {
  readonly category: "date";
  readonly mode: "casual" | "strict";
  readonly referenceDate: string;
  readonly timezone?: string | number;
  readonly resolvedStart: string;
  readonly resolvedEnd?: string;
  readonly certainComponents: readonly Component[];
  readonly parserTags: readonly string[];
}

export interface NaturalDatePatternOptions<TTag extends string>
  extends BuiltInPatternOptions<TTag> {
  /** Resolve relative expressions against this instant. Captured when the pattern is created. */
  readonly referenceDate?: Date;
  readonly timezone?: string | number;
  readonly forwardDate?: boolean;
  /** Restrict matches to formal date expressions. Casual mode is enabled by default. */
  readonly strict?: boolean;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function resolvedValue(components: ParsedResult["start"]): string {
  const hasTime = (["hour", "minute", "second", "millisecond"] as const).some(
    (component) => components.isCertain(component),
  );
  if (hasTime) return components.date().toISOString();
  return `${components.get("year")}-${pad(components.get("month") ?? 0)}-${pad(
    components.get("day") ?? 0,
  )}`;
}

export function naturalDatePattern(
  options?: Omit<NaturalDatePatternOptions<"date">, "tag"> & {
    readonly tag?: "date";
  },
): BuiltInPattern<"date", NaturalDateEntityMetadata>;
export function naturalDatePattern<TTag extends string>(
  options: NaturalDatePatternOptions<TTag> & { readonly tag: TTag },
): BuiltInPattern<TTag, NaturalDateEntityMetadata>;
export function naturalDatePattern(
  options: NaturalDatePatternOptions<string> = {},
): BuiltInPattern<string, NaturalDateEntityMetadata> {
  const referenceDate = new Date(options.referenceDate?.getTime() ?? Date.now());
  if (Number.isNaN(referenceDate.getTime())) {
    throw new RangeError("naturalDatePattern referenceDate must be a valid Date.");
  }
  const mode = options.strict ? "strict" : "casual";
  const parser = options.strict ? strict : casual;
  const reference: ParsingReference = {
    instant: referenceDate,
    ...(options.timezone === undefined ? {} : { timezone: options.timezone }),
  };
  const matcher: PatternMatcher<NaturalDateEntityMetadata> = (text) =>
    parser
      .parse(text, reference, {
        ...(options.forwardDate === undefined
          ? {}
          : { forwardDate: options.forwardDate }),
      })
      .map((result) => {
        const resolvedStart = resolvedValue(result.start);
        const resolvedEnd = result.end
          ? resolvedValue(result.end)
          : undefined;
        return {
          value: result.text,
          start: result.index,
          end: result.index + result.text.length,
          normalizedValue:
            resolvedEnd === undefined
              ? resolvedStart
              : `${resolvedStart}/${resolvedEnd}`,
          metadata: {
            category: "date" as const,
            mode,
            referenceDate: referenceDate.toISOString(),
            ...(options.timezone === undefined
              ? {}
              : { timezone: options.timezone }),
            resolvedStart,
            ...(resolvedEnd === undefined ? {} : { resolvedEnd }),
            certainComponents: ([
              "year",
              "month",
              "day",
              "weekday",
              "hour",
              "minute",
              "second",
              "millisecond",
              "meridiem",
              "timezoneOffset",
            ] as const).filter((component) =>
              result.start.isCertain(component),
            ),
            parserTags: [...result.tags()],
          },
        };
      });

  return {
    id: options.id ?? "builtin-natural-date",
    tag: options.tag ?? "date",
    pattern: matcher,
    confidence: options.confidence ?? (options.strict ? 0.95 : 0.88),
    priority: options.priority ?? 0,
  };
}
