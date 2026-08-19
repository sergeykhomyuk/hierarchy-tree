# Codex G4 review — hierarchy-tree-refinements full diff (main..HEAD)

Fresh Codex thread, read-only review per codex-contract.md.

## Verdict

2 findings (1 blocking)

## Findings

1. The refactor changes expansion telemetry by warning again when the same invalid `expanded` URL is revisited. | `src/features/hierarchy/useExpansion.ts:95-116`; `src/features/hierarchy/useExpansion.test.tsx:269-285` | The new parsed-object identity guard emits twice where the former parameter-string guard emitted once, and the new test explicitly requires this behavior change, violating the behavior-preservation contract. | BLOCKING
2. Two new comments describe WHAT the functions do instead of non-obvious WHY. | `src/features/hierarchy/domain/defaultExpansion.ts:4`; `src/features/hierarchy/domain/flattenVisible.ts:23` | They conflict with `CLAUDE.md` comment guidance but do not affect behavior. | non-blocking

## Answers

- Correctness: Apart from finding 1, no correctness failure found. The hierarchy barrels export every symbol required by rewired consumers (`domain/index.ts:1-28`, `data/index.ts:1-3`, `testing/index.ts:1`). Auth declaration merging correctly targets the declaring module at `@platform/observability/analyticsEvents` (`auth/data/analyticsEvents.ts:7-22`). `SignInOutcome` is exported through the auth data barrel and used for all three settled paths in `useLoginSubmission.ts:98-130`; its tests import the moved symbol and distinguish all outcomes at `useLoginSubmission.test.tsx:195-236`.
- Acceptance criteria: AC1 is not satisfied because expansion-warning telemetry changes as described in finding 1; the row memoization and extracted focus, keyboard, toggle, announcement, and hierarchy-toggle telemetry paths otherwise preserve the inspected implementation. AC2 is satisfied. AC3 is satisfied: no required barrel export is missing, and deliberate `vi.spyOn` imports remain concrete.
- Regressions outside scope: Finding 1 is an explicit behavior change outside the stated refactor work. No other concrete behavioral regression was found.
- Boundary/layering violations: None found. Platform no longer imports or exports auth vocabulary, feature consumers use public feature entries, and no new cross-feature deep import appears. The declaration augmentation is feature-to-platform and conforms to the configured dependency direction.
- Test discrimination: The memoization test (`HierarchyTree.test.tsx:838-867`) and both interaction-hook tests (`useHierarchyTreeInteractions.test.tsx:54-116`) would fail against their named broken implementations. The auth augmentation test is meaningful at compile time, although its direct mock calls do not prove application emission timing; the existing login tests do. The new repeated-stale-link test is discriminating, but it codifies the forbidden behavior change. Barrel completeness is primarily established by compilation of the rewired consumers rather than a dedicated runtime test. Committed evidence records typecheck, lint, 144 test files/653 tests, build verification, and size checks passing; tests were not rerun to preserve the read-only constraint.
- WHAT-comment style nit: Finding 2 is non-blocking.
