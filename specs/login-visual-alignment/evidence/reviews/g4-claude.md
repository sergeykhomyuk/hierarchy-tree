# G4 Claude review - login-visual-alignment

## Verdict

1 finding (0 blocking)

## Findings

1. Cosmetic double-space in the `Button` className template literal when `fullWidth` is falsy: `` `...disabled:opacity-50 ${fullWidth ? 'w-full' : ''} ${busy ? ...}` `` leaves two consecutive spaces between `disabled:opacity-50` and the variant class when `fullWidth` is unset. `src/shared/ui/Button.tsx:68`. No functional or visual effect (HTML `class` attribute tolerates extra whitespace, `classList`/`toHaveClass` both split on whitespace correctly), so this is purely a style nit. Non-blocking.

I did not find any correctness bugs, boundary violations, or accessibility/RTL/dark-mode regressions in this diff.

## What I examined

- Full diff plus the current on-disk versions of `LoginPage.tsx`, `Button.tsx`, `Field.tsx`, `Input.tsx`, `fieldContext.ts`, `Card.tsx`, `ApplicationLayout.tsx`
- Other `Button` call sites: `SignedInHeader.tsx`, `LoginAlert.tsx`, `app/testing/kitStates.tsx`
- `src/shared/theme/theme.css` for every custom color token touched (`canvas-login`, `ink-muted`, `ink-placeholder`, `border-field`, `danger`) - all have both light and dark values
- `package.json` for the Tailwind version (`^4.3.3`, which supports the `start-*` logical-property utilities used in the skip link)

## Answers to review questions

- **Root cause vs. masking**: The fix is genuinely additive Tailwind utility classes plus one new opt-in `fullWidth` boolean prop on `Button`. No control flow, state, effect, or data logic changed anywhere in the diff. This addresses the stated root cause directly rather than papering over a deeper defect.
- **Could it mask other failures?**: No. Nothing in the diff swallows errors, changes conditionals, or alters what gets rendered when - only how it's styled/nested. No existing test assertions were weakened, removed, or rewritten.
- **Regression coverage**: Adequate. Each visual defect named in the task has a corresponding new class-based assertion.
- **Boundary violations**: None. `fullWidth` is a generic, domain-free UI prop on the shared `Button`; no cross-feature imports; `shared/ui` stays framework/domain-agnostic.
- **Accessibility regressions**: None. The skip-link pattern is the standard accessible-hide-until-focused idiom.
- **RTL**: The skip link's focus position correctly uses the logical `start-4`/`top-4` utility rather than a physical `left-4`.
- **Dark mode**: Every new/changed color token already has a dark-mode value defined in `theme.css`.
- **`fullWidth` interaction with other `Button` call sites**: `SignedInHeader.tsx`, `LoginAlert.tsx`, and every `Button` render in `kitStates.tsx` omit the new prop, so no visual regression at those call sites.
