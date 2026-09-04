function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Shallow merge metadata. Later object keys win; non-object enrichment replaces. */
export function mergeMetadata<T>(base: T | undefined, next: Partial<T> | T | undefined): T | undefined {
  if (next === undefined) return base;
  if (isRecord(base) && isRecord(next)) return { ...base, ...next } as T;
  return next as T;
}

