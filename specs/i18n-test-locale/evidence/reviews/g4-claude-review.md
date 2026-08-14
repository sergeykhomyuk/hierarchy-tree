# G4 review - loop-reviewer (fresh context), initial pass

## Findings

**1. `createKeyEchoCatalogue.test.ts` is untracked on the branch, not actually committed** — REJECTED as false. Reviewer used this conversation's stale session-start `git status` snapshot instead of running its own check. Independently verified: the file is committed at `85c4134` and correctly present in the diff (`git show HEAD:<path>`, `git diff main...loop/feature/i18n-test-locale -- <path>` both confirm it).

**2. `createKeyEchoCatalogue`'s recursive walker mishandles array, null, and non-string/non-object leaf values at runtime, guarded only by TypeScript's structural typing, not by any runtime check.** Non-blocking per this reviewer (Codex rated the same underlying issue blocking as its own finding 1). ACCEPTED — user confirmed: the function's own parameter type (`Catalogue = { [key: string]: Catalogue | string }`) already rejects such shapes at compile time for any real i18next catalogue, present or future; adding a runtime guard for a type-system-prevented scenario is unrequested defensive code per this repo's conventions.

## Answers to spawn prompt questions

1. `createKeyEchoCatalogue` never mutates input - confirmed (builds a fresh object at every recursion level).
2. `loadTranslations.ts` conditional echo - no race with WeakMap dedup (`instance.language` is fixed at construction, `fallbackLng: false`, never mutated).
3. `createRuntime.ts`'s `common` echo fix - verified complete, identical ternary pattern to `loadTranslations.ts`, backed by real red→green evidence and a real e2e run.
4. `detectLocale`'s subtag matching - no surprising match found.
5. All 20 SPEC.md invariants spot-checked and verified against actual code.
6. No regressions outside stated scope.
7. Tests are real, not tautological - confirmed via red-phase evidence showing exactly the expected pre-fix failures.
8. Repo conventions followed throughout (no `enum`/literal unions, no `as`/`any` casts in production code, one-symbol-per-file, no cross-boundary imports).

## Verdict

2 findings (1 blocking, later determined false). Not ready to merge until finding 1 resolved - but finding 1 was itself false (verified). Implementation otherwise correct.

---

## Fix-confirmation pass (second spawn, after Codex-2's real casts were fixed)

Confirmed: CONFIRMED (fix is correct and complete), with one process caveat.

- The 2 real `as Catalogue`/`as Catalogue | undefined` casts are gone, replaced with a genuine `isRecord(value): value is Record<string, unknown>` runtime type guard at both call sites (`collectLeafPaths`, `leafValueAt`).
- The 3 remaining `as unknown` occurrences are safe widening, not violations.
- Both new tests (`locale.test.ts`'s exactly-two-members check, `detectLocale.test.ts`'s leading-dash case) discriminate correctly against the named regressions.
- Process caveat (now fixed): `g4-fix-diff.txt` was initially generated via `git diff main...HEAD` BEFORE the fix was committed, so it only showed committed history and missed the uncommitted fix - non-blocking for the code, but the evidence artifact was misleading. Fixed: fix committed at `4fd330d`, diff files regenerated to reflect it.

No new findings.
