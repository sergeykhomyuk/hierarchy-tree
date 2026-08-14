# G1 fix-confirmation - Codex second opinion, round 2

3 of 4 resolved

1. PARTIALLY RESOLVED | "`'pseudo'` is verified valid ... so no `Intl`/HTML-`lang` validation path rejects it." (SPEC.md:11, pre-round-2 text) | The `Intl` half is resolved: `Intl.getCanonicalLocales('pseudo')` returned `['pseudo']`, and `new Intl.DateTimeFormat('pseudo')` succeeded. However, an actual axe-core 4.13.0 probe against `<html lang="pseudo">` produced a serious `html-lang-valid` violation. Therefore the spec's axe claims at lines 7, 11, 23, 180, and 189 are false. For comparison, `'zxx'` succeeds with both `Intl` checks and produces no axe violation.

2. RESOLVED | "The generator never mutates its input. It builds and returns a new object tree." (SPEC.md:16); testing requires "the source catalogue object is unchanged after generation" and a test/English registration sequence (SPEC.md:173) | The non-mutation contract and discriminating regression coverage are now explicit.

3. RESOLVED | "Both files change (a new test is added); neither file's existing case changes." (SPEC.md:26) | The former contradiction is removed. The validation section consistently requires a new `Locale.Test` case while preserving the existing English case.

4. RESOLVED | "This invariant does NOT claim which specific chunk the catalogue generator lands in" and any uncovered chunk becomes a Verify-phase finding to resolve (SPEC.md:30); validation explicitly requires inspecting the real manifest and checking for chunks absent from `.size-limit.json` (SPEC.md:178) | The unverified Rollup-placement assumption has been removed and replaced with build-output inspection plus a required response to uncovered chunks.

The spec is not ready for sign-off yet. Finding 1 remains blocking: replace `'pseudo'` with an axe-valid tag and update every associated claim and assertion. `'zxx'` passed the same `Intl` and axe checks locally and preserves the single-subtag detection design.

No files were modified.

---
Note from driving session: independently re-verified via direct execution against the repo's own installed axe-core 4.13.0 (node + jsdom): 'pseudo' and 'qtz' both produce an `html-lang-valid` violation; 'zxx' and 'en' produce zero violations. SPEC.md revised to use 'zxx' throughout (user confirmed via AskUserQuestion). Codex's own round-2 statement above already confirms 'zxx' passes both checks it ran, so finding 1 is treated as resolved on the combination of Codex's own round-2 verification + this session's independent re-verification, without a third redundant round-trip.
