// Declaration merging targets the module that DECLARES AnalyticsPayloads,
// not the @platform/observability barrel that re-exports it - augmenting
// the barrel's re-exported binding merges nothing the facade can see
// (TECH.md's decision log).
declare module '@platform/observability/analyticsEvents' {
  interface AnalyticsPayloads {
    'hierarchy.viewed': {
      readonly peopleCount: number;
      readonly managerCount: number;
      readonly rootCount: number;
      readonly droppedCount: number;
    };
    'hierarchy.load_failed': {
      readonly failureKind: string;
      readonly correlationId: string;
    };
    // No name, no email and no person id (invariant 115) - only the new
    // state and the row's depth.
    'hierarchy.toggled': {
      readonly expanded: boolean;
      readonly depth: number;
    };
    // One event for the whole `*` action (invariant 141), not one per
    // branch it opened - the same privacy rule as 'hierarchy.toggled'
    // (invariant 115): no name, no email, no person id.
    'hierarchy.siblings_expanded': {
      readonly count: number;
      readonly depth: number;
    };
  }
}

export {};
