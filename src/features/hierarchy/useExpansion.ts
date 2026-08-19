import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import type { ObservabilityFacade } from '@platform/observability';
import { defaultExpansion } from './domain/defaultExpansion';
import {
  collectManagerIds,
  formatExpansion,
  parseExpansion,
} from './domain/expansionParameter';
import type { PersonIdentifier } from './domain/personIdentifier';
import type { TreeNode } from './domain/treeNode';

const EXPANDED_PARAM = 'expanded';

export type UseExpansionResult = {
  readonly expandedIds: ReadonlySet<PersonIdentifier>;
  readonly toggleExpanded: (personId: PersonIdentifier) => void;
  // The asterisk key's one action opening several branches at once
  // (invariant 141) - a single setSearchParams call, one history entry,
  // rather than one toggle per id.
  readonly expandMany: (personIds: readonly PersonIdentifier[]) => void;
};

// Takes the raw parameter string rather than a URLSearchParams object -
// useSearchParams() returns a new URLSearchParams instance every render
// regardless of whether the URL actually changed, so deriving expandedIds
// from the object itself (rather than the one string it reads) would
// re-run, and re-identity, on every unrelated render (invariant 91: this
// is what previously let expandMany, and everything memoized on it down to
// TreeRow's onKeyDown, churn identity on every toggle).
function readExpandedIds(
  expandedParam: string | null,
  roots: readonly TreeNode[],
): ReadonlySet<PersonIdentifier> {
  const { expanded } = parseExpansion(expandedParam, roots);
  return expanded ?? defaultExpansion(roots);
}

// Every write path funnels the set it's about to serialize through this -
// defaultExpansion includes every root regardless of whether it has
// children (invariants 87, 88), but invariant 116 says the expanded
// parameter holds only "the ids of the expanded manager rows," so a
// childless root's id must never reach the URL even though it legitimately
// reaches expandedIds itself.
function toManagerIds(
  ids: ReadonlySet<PersonIdentifier>,
  managerIds: ReadonlySet<PersonIdentifier>,
): ReadonlySet<PersonIdentifier> {
  return new Set([...ids].filter((id) => managerIds.has(id)));
}

// Wraps useSearchParams rather than owning state of its own - the expanded
// parameter, and only that parameter, is the single source of what's open
// (invariants 116, 126). setSearchParams pushes a history entry by default,
// which is invariant 122, and starting the next value from the current
// URLSearchParams rather than a fresh one leaves every other parameter -
// phase 2's from included - untouched (invariant 127).
export function useExpansion(
  roots: readonly TreeNode[],
  observability: ObservabilityFacade,
): UseExpansionResult {
  const [searchParams, setSearchParams] = useSearchParams();
  // react-router's own setSearchParams is not referentially stable across
  // a URL change (it closes over the CURRENT searchParams object, which
  // useSearchParams recomputes from location.search on every navigation)
  // - so every toggle, which changes the URL, would otherwise churn
  // toggleExpanded's and expandMany's identity too, on top of the
  // expandedIds issue above. Read through a ref for the same reason
  // expandedIdsRef exists below: only roots (stable across a toggle)
  // should decide whether these callbacks get a new identity.
  const setSearchParamsRef = useRef(setSearchParams);
  useEffect(() => {
    setSearchParamsRef.current = setSearchParams;
  });
  const expandedParam = searchParams.get(EXPANDED_PARAM);
  const parsed = useMemo(
    () => parseExpansion(expandedParam, roots),
    [expandedParam, roots],
  );
  const fallbackDefault = useMemo(() => defaultExpansion(roots), [roots]);
  const expandedIds = parsed.expanded ?? fallbackDefault;

  // Read via a ref inside expandMany's no-op check rather than closed over
  // directly - expandedIds legitimately gets a new identity on every real
  // toggle (the URL just changed), so making it an expandMany dependency
  // would still churn expandMany's own identity on every toggle even after
  // the earlier fix for unrelated renders, the same invariant-91 failure
  // one level up (toggleExpanded already avoids this the same way: it
  // never depended on expandedIds to begin with).
  const expandedIdsRef = useRef(expandedIds);
  useEffect(() => {
    expandedIdsRef.current = expandedIds;
  });

  // Reported once per parse (invariant 121) - guarded by parsed's own
  // OBJECT IDENTITY, not the raw param string: useMemo recomputes parsed
  // exactly when expandedParam or roots actually change, so two visits to
  // the same stale URL with a different one in between are two distinct
  // parsed objects (the memo cache is invalidated by the render in
  // between) and both correctly report - a string-keyed guard would wrongly
  // suppress the second visit, since the string itself repeats even though
  // it is a genuinely new parse. The one case this DOES dedupe - the
  // identical parsed reference seen twice - is exactly React StrictMode's
  // development-only double-invoke (bootstrap.ts wraps the app in
  // StrictMode): it re-runs this effect a second time with the SAME
  // render's SAME parsed object, immediately after the first, which a
  // dependency array alone cannot distinguish from a real second parse.
  const lastReportedParsedRef = useRef<typeof parsed | undefined>(undefined);
  useEffect(() => {
    if (parsed.skipped > 0 && lastReportedParsedRef.current !== parsed) {
      lastReportedParsedRef.current = parsed;
      observability.logger.warn('hierarchy.expansion_segments_skipped', {
        skipped: parsed.skipped,
      });
    }
  }, [parsed, observability]);

  const toggleExpanded = useCallback(
    (personId: PersonIdentifier) => {
      setSearchParamsRef.current((current) => {
        const managerIds = collectManagerIds(roots);
        const next = new Set(
          toManagerIds(
            readExpandedIds(current.get(EXPANDED_PARAM), roots),
            managerIds,
          ),
        );
        if (next.has(personId)) {
          next.delete(personId);
        } else {
          next.add(personId);
        }
        const nextParams = new URLSearchParams(current);
        nextParams.set(EXPANDED_PARAM, formatExpansion(next));
        return nextParams;
      });
    },
    [roots],
  );

  // Checked against the current render's expandedIds, not inside the
  // setSearchParams updater - a no-op case must skip the call entirely,
  // since setSearchParams always pushes a history entry regardless of
  // whether the resulting URL actually differs.
  const expandMany = useCallback(
    (personIds: readonly PersonIdentifier[]) => {
      if (personIds.every((personId) => expandedIdsRef.current.has(personId)))
        return;
      setSearchParamsRef.current((current) => {
        const managerIds = collectManagerIds(roots);
        const next = new Set(
          toManagerIds(
            readExpandedIds(current.get(EXPANDED_PARAM), roots),
            managerIds,
          ),
        );
        for (const personId of personIds) next.add(personId);
        const nextParams = new URLSearchParams(current);
        nextParams.set(EXPANDED_PARAM, formatExpansion(next));
        return nextParams;
      });
    },
    [roots],
  );

  return { expandedIds, toggleExpanded, expandMany };
}
