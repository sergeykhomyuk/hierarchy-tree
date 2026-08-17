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
  }
}

export {};
