import type { Entity } from "../types/Entity";
import type { MatchContext, PatternMatch } from "../types/Pattern";
import { mergeMetadata } from "../utilities/metadata";
import { isValidRange } from "../utilities/ranges";
import { clampConfidence } from "../utilities/scoring";
import type { RegisteredPattern } from "./Registry";

export interface EntityCandidate<TTag extends string, TMetadata>
  extends Entity<TTag, TMetadata> {
  readonly priority: number;
  readonly allowOverlap: boolean;
  readonly registrationOrder: number;
}

function advancePastEmptyMatch(regex: RegExp, text: string): void {
  const index = regex.lastIndex;
  if (regex.unicode && index < text.length) {
    const point = text.codePointAt(index);
    regex.lastIndex += point !== undefined && point > 0xffff ? 2 : 1;
  } else {
    regex.lastIndex += 1;
  }
}

function regexMatches<TMetadata>(regex: RegExp, text: string): PatternMatch<TMetadata>[] {
  const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
  const clone = new RegExp(regex.source, flags);
  const matches: PatternMatch<TMetadata>[] = [];
  let match: RegExpExecArray | null;
  while ((match = clone.exec(text)) !== null) {
    const value = match[0];
    if (value.length > 0) {
      matches.push({ value, start: match.index, end: match.index + value.length });
    } else {
      advancePastEmptyMatch(clone, text);
    }
  }
  return matches;
}

function matchContext(text: string, start: number, end: number, window: number): MatchContext {
  return {
    text,
    start,
    end,
    before: text.slice(Math.max(0, start - window), start),
    after: text.slice(end, Math.min(text.length, end + window)),
  };
}

export function scan<TTag extends string, TMetadata, TServices>(
  text: string,
  patterns: readonly RegisteredPattern<TTag, TMetadata, TServices>[],
  contextWindow: number,
  defaultConfidence: number,
): EntityCandidate<TTag, TMetadata>[] {
  const candidates: EntityCandidate<TTag, TMetadata>[] = [];
  const seenIds = new Set<string>();
  const recognitionCache = new Map<unknown, unknown>();
  const recognitionContext = {
    text,
    memoize<T>(key: unknown, create: () => T): T {
      if (recognitionCache.has(key)) return recognitionCache.get(key) as T;
      const value = create();
      recognitionCache.set(key, value);
      return value;
    },
  };

  for (const definition of patterns) {
    if (!definition.enabled) continue;
    const rawMatches =
      definition.pattern instanceof RegExp
        ? regexMatches<TMetadata>(definition.pattern, text)
        : definition.pattern(text, recognitionContext);

    for (const match of rawMatches) {
      if (!isValidRange(text, match.start, match.end)) continue;
      const sourceValue = text.slice(match.start, match.end);
      if (sourceValue !== match.value) continue;

      const context = matchContext(text, match.start, match.end, contextWindow);
      const patternConfidence =
        typeof definition.confidence === "function"
          ? definition.confidence(sourceValue, context, match)
          : (definition.confidence ?? defaultConfidence);
      const confidence = clampConfidence(match.confidence ?? patternConfidence);
      const patternMetadata = definition.metadata?.(sourceValue, context);
      const metadata = mergeMetadata(patternMetadata, match.metadata);
      const normalizedValue =
        match.normalizedValue ?? definition.normalize?.(sourceValue, context) ?? sourceValue;
      const id = `${definition.tag}:${match.start}:${match.end}:${definition.id}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      candidates.push({
        id,
        tag: definition.tag,
        value: sourceValue,
        normalizedValue,
        start: match.start,
        end: match.end,
        confidence,
        ...(metadata === undefined ? {} : { metadata }),
        source: "pattern",
        patternId: definition.id,
        validation: { status: "not_requested" },
        priority: definition.priority ?? 0,
        allowOverlap: definition.allowOverlap ?? false,
        registrationOrder: definition.registrationOrder,
      });
    }
  }
  return candidates;
}
