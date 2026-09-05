import type { PatternMatcher } from "../../types/Pattern";

export function builtInId(id: string | undefined, suffix: string): string {
  return id ? `${id}-${suffix}` : `builtin-${suffix}`;
}

export function capturedPattern(
  regex: RegExp,
  captureGroup = 1,
  accept: (value: string) => boolean = () => true,
): PatternMatcher {
  return (text) => {
    const matches = [];
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (!match[0]) {
        regex.lastIndex += 1;
        continue;
      }
      const value = match[captureGroup];
      if (!value || !accept(value)) continue;
      const captureOffset = match[0].indexOf(value);
      const start = match.index + Math.max(0, captureOffset);
      matches.push({ value, start, end: start + value.length });
    }
    return matches;
  };
}

export function digits(value: string): string {
  return value.replace(/\D/g, "");
}
