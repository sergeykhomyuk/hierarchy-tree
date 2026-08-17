# G1 narrow verification of the residue fixes - Codex (raiser's own thread, read-only)

Loop: phase-2-login (feature/L). Gate G1. Date: 2026-08-14.

Both confirmation rounds left residues: Codex rated its own findings 10 and 12 PARTIAL and
reported four regressions the edit pass introduced (A-D); the fresh Claude re-check rated
Claude-7 PARTIAL and reported five more (D1-D5, two of them blocking). The driving session fixed
all eleven. This pass verifies only those eleven.

It ran as `codex exec resume 01a000f2-4da9-70e3-9c68-c728fd7f6d39` - the thread that raised the
Codex findings, so items 1 and 2 are the raiser confirming its own. Items 3-11 originated with the
Claude side; Codex is an independent checker for those rather than their raiser, which is recorded
here rather than glossed. The equivalent Claude-side pass was attempted three times and died on
the account's monthly spend limit each time.

Saved verbatim as it was returned.

---

1. VERIFIED - PRODUCT now accepts only "a finite integer, or a non-empty string drawn only from `A-Z`, `a-z`, `0-9`, hyphen and underscore" (`PRODUCT.md:342`), and TECH now says "`null | charset-restricted string | finite integer`" (`TECH.md:287`).

2. VERIFIED - The sequence now says "`null -> summary alert`" (`ARCHITECTURE.md:61`), and security now says the password enters no URL while the derived secret enters exactly the required lookup URL (`ARCHITECTURE.md:134`). Decision-log entries 181-189 cover every requested decision; each states the choice, rationale, and explicit "Rejected" alternatives.

3. VERIFIED - TECH says "exactly five things," matching the five declared properties (`TECH.md:369-378`).

4. VERIFIED - The sweep now asserts "email, password in idle" with Login absent, then includes Login in ready, submitting, no-match, and service-problem states (`TECH.md:1940-1947`).

5. VERIFIED - M1 now delivers the complete store factory, memo, `read`, fetch, schema, and view (`TECH.md:1417-1424`); M4 says it adds only the store's first reader and "no data access" (`TECH.md:1503-1507`).

6. VERIFIED - The rationale now says "the same five files" and names exactly five paths (`TECH.md:1523-1526`).

7. VERIFIED - Invariant 44 now says "The one exception is a submission started from the retry control" (`PRODUCT.md:103-105`); invariant 60 deliberately moves focus to Login (`PRODUCT.md:130-132`), and invariant 110 records the same exception (`PRODUCT.md:235`).

8. STILL OPEN - `renderRoute` really renders only `<ApplicationRoot>` with no router (`src/app/testing/renderRoute.tsx:73-80`), and TECH correctly moves `useLoaderData()` to `AuthenticatedLayout`, passing the promise through props (`TECH.md:1020-1037`). However, TECH then says component tests can pass a "rejected promise" (`TECH.md:393-397,1029-1035`), contradicting its own requirement that the store promise "never rejects" because rejection reaches `RouteErrorBoundary` (`TECH.md:1042-1047`). The 97c component-test arrangement is therefore still misstated.

9. VERIFIED - M2 now owns all five migrations (`TECH.md:1451-1462`). The current tests contain exactly the claimed assertions: `login.title` and `login.documentTitle` (`e2e/placeholder-routes.spec.ts:41-44`), `login.title` (`e2e/telemetry-buffer.spec.ts:40-42`), the `/login` accessibility entry (`e2e/accessibility.spec.ts:7`), the RTL entry (`e2e/right-to-left.spec.ts:36`), and "Sign in isn't built yet" (`e2e/deployed-smoke.spec.ts:25-33`).

10. VERIFIED - TECH requires the third block to repeat `patterns: [SINKS_IMPORT_PATTERN]` (`TECH.md:887-900`), and the existing feature-scoped block really carries that pattern (`eslint.config.js:572-593`, specifically line 589).

11. VERIFIED - All requested citations now land correctly: the redirect-ban blocks are `eslint.config.js:549-571` and `572-593`; the home test is `e2e/placeholder-routes.spec.ts:6-30`; Skeleton has `aria-hidden` and `animate-pulse` at `src/shared/ui/Skeleton.tsx:38-39`; Button has its busy ARIA attributes at `src/shared/ui/Button.tsx:45-46`; and `checkWholeScopeVocabulary` occupies `scripts/assert-domain-vocabulary.mjs:138-168`.

New contradiction - ARCHITECTURE's decisions have landed, but PRODUCT still says they "need" entries and quotes the superseded architecture wording (`PRODUCT.md:319-325,339-340`), while TECH still says it "owes ARCHITECTURE.md" those entries and that the driving session must add them (`TECH.md:2217-2224`). This now contradicts `ARCHITECTURE.md:181-189`.

10 of 11 are VERIFIED; the specs are not yet fully implementable as written because item 8 and the newly stale decision-log instructions remain contradictory.

---

## Driving session's follow-up (after this pass, not re-verified by a reviewer)

Both remaining items were fixed immediately and are recorded here so the gap between this
record and the signed-off specs is visible rather than implied:

- **Item 8.** `TECH.md`'s two "rejected promise" phrasings are replaced. Component tests now hand
  `SignedInName` the only two settled shapes the promise has - resolved to a `SignedInUserView`
  and resolved to `null` - plus a pending one for the skeleton, and the text states explicitly
  that a rejected promise is *not* among the cases because the store never produces one; 97c's
  five failure arms are exercised by driving `fetchSignedInUser` through each `HttpResult` arm and
  asserting it resolves to `null`.
- **The new contradiction.** Both list headers now record that the decision-log entries are
  written rather than owed: PRODUCT's section gains a "Status: the entries are written" paragraph
  naming the two amended ARCHITECTURE statements, and TECH's section is retitled "Decision-log
  entries this phase records in ARCHITECTURE.md" with the same status, keeping the
  mechanism-and-milestone index for the entries whose implementation lands later.
