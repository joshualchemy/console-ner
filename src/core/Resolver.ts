import { rangesOverlap } from "../utilities/ranges";
import type { EntityCandidate } from "./Scanner";

function byRank<TTag extends string, TMetadata>(
  left: EntityCandidate<TTag, TMetadata>,
  right: EntityCandidate<TTag, TMetadata>,
): number {
  return (
    right.priority - left.priority ||
    right.confidence - left.confidence ||
    right.end - right.start - (left.end - left.start) ||
    left.registrationOrder - right.registrationOrder ||
    left.start - right.start
  );
}

export function resolveOverlaps<TTag extends string, TMetadata>(
  candidates: readonly EntityCandidate<TTag, TMetadata>[],
): EntityCandidate<TTag, TMetadata>[] {
  const accepted: EntityCandidate<TTag, TMetadata>[] = [];
  for (const candidate of [...candidates].sort(byRank)) {
    const conflict = accepted.some(
      (current) =>
        rangesOverlap(candidate, current) && !candidate.allowOverlap && !current.allowOverlap,
    );
    if (!conflict) accepted.push(candidate);
  }

  return accepted.sort(
    (left, right) =>
      left.start - right.start ||
      left.end - right.end ||
      left.registrationOrder - right.registrationOrder,
  );
}

