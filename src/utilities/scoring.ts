/** Clamp a confidence score to the inclusive 0–1 range. Non-finite values become 0. */
export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function confidenceThreshold(value: number | undefined, fallback = 1): number {
  return clampConfidence(value ?? fallback);
}

