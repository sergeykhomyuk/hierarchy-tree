import {
  HttpResultOutcome,
  type HttpClient,
  type HttpFailure,
} from '@platform/http';
import { buildForest } from '../domain/buildForest';
import type { ForestAnomalies } from '../domain/forestAnomaly';
import type { ForestSummaryCounts } from '../domain/buildForest';
import type { TreeNode } from '../domain/treeNode';
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

// The HTTP client never throws or rejects (fetchSignedInUser.ts's own
// precedent), and neither does this repository: every non-success outcome
// maps to a HierarchyResult arm instead (invariant 174).
export async function fetchPeople(
  http: HttpClient,
  correlationId: string,
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
    return {
      kind: HierarchyResultKind.Failure,
      failure: result.failure.kind,
      correlationId,
    };
  }

  const { people, dropped } = result.value;

  if (people.length === 0) {
    if (dropped > 0) {
      return {
        kind: HierarchyResultKind.Failure,
        failure: 'allRowsInvalid',
        correlationId,
      };
    }
    return { kind: HierarchyResultKind.Empty };
  }

  const { roots, anomalies, counts } = buildForest(people);

  return {
    kind: HierarchyResultKind.Data,
    roots,
    anomalies,
    counts,
    dropped,
  };
}
