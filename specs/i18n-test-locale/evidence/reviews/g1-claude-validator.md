# G1 spec validation - loop-spec-validator (fresh context)

## Verdict

3 findings (2 blocking)

## Findings

**Claude-1 (BLOCKING) — The spec's own doc edits leave three untouched "a second locale is deliberately not built" statements standing, directly contradicted by what this spec ships.**

Location: Spec's "Tech approach > Decision-log text (R12)" section (lines 124-140), specifically the sentence "only `ARCHITECTURE.md`'s decision log and `PRODUCT.md`'s invariant 65 are updated, per the agreed scope" (Non-goals, last bullet).

I found three separate places in the repo, none touched by this spec, that state a second locale is deliberately not built:
- `specs/ARCHITECTURE.md:187` — "**A second locale, SSR, a component library** - infrastructure supports each; none is needed to satisfy the goal." (section 7, "Deliberately not built")
- `specs/ROADMAP.md:115` — "**A second locale, SSR, a component library** - the infrastructure supports each; none is needed." This line is explicitly introduced as "Carried from `ARCHITECTURE.md` section 7 so that reading only this file does not lead somewhere it should not" (line 108).
- `specs/phase-1-setup/PRODUCT.md:224` — "A second locale, SSR and a component library. The infrastructure supports each; none is needed." (a separate "what's not built" list, distinct from invariant 65 which the spec does edit at line 100).

The spec's proposed ARCHITECTURE.md decision-log entry argues `test` "is not a product locale at all," but none of these three lines make that product/test distinction — they flatly say "a second locale... none is needed," and after this change a second locale (albeit test-only) does exist and ships in the production build. A reader hitting any of these three lines (all designed to be read standalone, per ROADMAP.md's own framing) would reasonably conclude this spec contradicts settled architecture.

Why it matters: an implementer or reviewer reading ROADMAP.md or PRODUCT.md's "not built" list after this change ships would see a stale claim contradicted by the shipped code, with no cross-reference explaining why.

**Claude-2 (BLOCKING) — Invariant 8 (the actual production wiring: `createRuntime.ts` calling `detectLocale(navigator.languages)`) has no committed automated test, despite the file that should carry it already existing.**

Location: Invariant 8 (line 16) and its testing entry (line 147): "`createRuntime.test.ts` (if one exists, or added) stubbing `navigator.languages` and asserting the resulting `i18n.language`; at minimum, `detectLocale`'s own unit coverage plus a read of the diff proves the wiring."

I confirmed `src/app/composition/createRuntime.test.ts` already exists (4 tests, none touching `navigator.languages` or `i18n.language`). The spec's own hedge ("if one exists, or added") shows this wasn't checked, and its fallback does not verify that `createRuntime.ts` actually calls `detectLocale` with `navigator.languages` and feeds the result into `language`. A bug here (e.g. passing `navigator.language` singular by mistake, or a typo swapping arguments) would pass `detectLocale.test.ts` and pass a manual diff read, and still be wrong in production.

**Claude-3 (non-blocking) — `createKeyEchoCatalogue`'s claimed return-type soundness is asserted, not demonstrated.**

Location: Tech approach, `createKeyEchoCatalogue.ts` bullet (line 52). JSON-imported catalogue leaf strings may type as string literals rather than widened `string`, which could make the recursive walker's string-typed replacement value unassignable back into `Catalogue` without a cast. Resolvable by the implementer prototyping against `tsc` before committing to the signature.

## What was checked (no issues found)

- Playwright project scoping: `chromiumProject.testIgnore` and `developmentProject.testMatch` partition `./e2e` with no overlap; the six specs listed in invariant 17 are exactly the six files that resolve to the `chromium` project.
- Playwright `locale: 'test'` validity / downstream `Intl` calls: grepped all `Intl.*` usage in `src` — the only call is the hardcoded `new Intl.ListFormat('en')` in `ConfigurationErrorScreen.tsx`, excluded by non-goals. **Note (superseded by Codex-1): this check concluded "should not throw" from training/syntax reasoning without executing the claim — Codex's review executed it and found it DOES throw. Codex-1 is the operative finding here, not this check.**
- `registerCatalogue` timing: `instance.language` is set synchronously during the awaited `.init()` call, and `loadTranslations` is only invoked later (from route `lazy()`), so `instance.language` is reliably populated by the time `registerCatalogue` reads it.
- `ConfigurationErrorScreen.tsx` exclusion: confirmed accurate.
- Cross-checked every concrete file/line citation in the spec against the actual repo — all accurate.

## Sign-off

Not ready for sign-off as-is. Claude-1 and Claude-2 should be resolved before implementation starts.
