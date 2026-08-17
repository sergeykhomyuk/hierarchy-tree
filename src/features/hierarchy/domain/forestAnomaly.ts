// Counts only, never a person's data - a dangling reference, a self-reference,
// a broken cycle or a duplicate id never carries the identifiers involved.
export type ForestAnomalies = {
  readonly duplicateId: number;
  readonly danglingManager: number;
  readonly selfManaged: number;
  readonly cycleBroken: number;
  readonly skippedExpansionSegment: number;
};
