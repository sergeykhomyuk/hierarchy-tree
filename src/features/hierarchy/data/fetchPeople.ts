import {
  HttpResultOutcome,
  type HttpClient,
  type HttpFailure,
} from '@platform/http';
import type { ObservabilityFacade } from '@platform/observability';
import { buildForest } from '../domain/buildForest';
import type { ForestAnomalies } from '../domain/forestAnomaly';
import type { ForestSummaryCounts } from '../domain/buildForest';
import type { TreeNode } from '../domain/treeNode';
import './analyticsEvents';
import { parsePeople } from './parsePeople';
import { USERS_RESOURCE_PATH } from './usersResourcePath';

export const HierarchyResultKind = {
  Data: 'data',
  Empty: 'empty',
  Failure: 'failure',
  Cancelled: 'cancelled',
} as const;

export type HierarchyResultKind =
  (typeof HierarchyResultKind)[keyof typeof HierarchyResultKind];

export type HierarchyFailureKind = HttpFailure['kind'] | 'allRowsInvalid';

export type HierarchyResult =
  | {
      readonly kind: typeof HierarchyResultKind.Data;
      readonly roots: readonly TreeNode[];
      readonly anomalies: ForestAnomalies;
      readonly counts: ForestSummaryCounts;
      readonly dropped: number;
    }
  | { readonly kind: typeof HierarchyResultKind.Empty }
  | {
      readonly kind: typeof HierarchyResultKind.Failure;
      readonly failure: HierarchyFailureKind;
      readonly correlationId: string;
    }
  | { readonly kind: typeof HierarchyResultKind.Cancelled };

// Iterates every ForestAnomalies field rather than a hardcoded list, so a
// future anomaly kind is reported automatically instead of silently going
// unreported until someone remembers to add it here (invariant 164).
// skippedExpansionSegment belongs to expansionParameter.ts, not a load's
// buildForest result, and is always 0 from this call path.
function reportAnomalies(
  observability: ObservabilityFacade,
  anomalies: ForestAnomalies,
): void {
  for (const [kind, count] of Object.entries(anomalies)) {
    if (kind === 'skippedExpansionSegment') continue;
    if (count > 0) {
      observability.logger.warn('hierarchy.anomaly_detected', {
        kind,
        count,
      });
    }
  }
}

// The HTTP client never throws or rejects (fetchSignedInUser.ts's own
// precedent), and neither does this repository: every non-success outcome
// maps to a HierarchyResult arm instead (invariant 174).
export async function fetchPeople(
  http: HttpClient,
  correlationId: string,
  observability: ObservabilityFacade,
  signal?: AbortSignal,
): Promise<HierarchyResult> {
  const result = await http.request({
    method: 'GET',
    resourcePath: USERS_RESOURCE_PATH,
    ...(signal !== undefined ? { signal } : {}),
    parse: (payload) => {
      const parsed = parsePeople(payload);
      if (parsed === 'invalidEnvelope') {
        throw new Error('invalid users envelope');
      }
      return parsed;
    },
  });

  if (result.outcome === HttpResultOutcome.Cancelled) {
    return { kind: HierarchyResultKind.Cancelled };
  }

  if (result.outcome === HttpResultOutcome.Failure) {
    observability.analytics.track('hierarchy.load_failed', {
      failureKind: result.failure.kind,
      correlationId,
    });
    return {
      kind: HierarchyResultKind.Failure,
      failure: result.failure.kind,
      correlationId,
    };
  }

  const { people, dropped, droppedFields } = result.value;

  if (people.length === 0) {
    if (dropped > 0) {
      observability.analytics.track('hierarchy.load_failed', {
        failureKind: 'allRowsInvalid',
        correlationId,
      });
      return {
        kind: HierarchyResultKind.Failure,
        failure: 'allRowsInvalid',
        correlationId,
      };
    }
    observability.analytics.track('hierarchy.viewed', {
      peopleCount: 0,
      managerCount: 0,
      rootCount: 0,
      droppedCount: 0,
    });
    return { kind: HierarchyResultKind.Empty };
  }

  const { roots, anomalies, counts } = buildForest(people);

  if (dropped > 0) {
    observability.logger.warn('hierarchy.rows_dropped', {
      count: dropped,
      fields: droppedFields,
    });
  }
  reportAnomalies(observability, anomalies);
  observability.analytics.track('hierarchy.viewed', {
    peopleCount: counts.people,
    managerCount: counts.managers,
    rootCount: counts.roots,
    droppedCount: dropped,
  });

  return {
    kind: HierarchyResultKind.Data,
    roots,
    anomalies,
    counts,
    dropped,
  };
}
