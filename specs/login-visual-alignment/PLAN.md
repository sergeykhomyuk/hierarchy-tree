# Plan: login-visual-alignment - Login page: align visual styling with mockup

## Brief

phase-2-login shipped the login page with correct behavior but incomplete Tailwind
styling on the layout-level markup. Root cause: `Card`, `Input`, `Button` and
`ProductMark` each carry their own utility classes, but the elements that stitch them
into a page - `ApplicationLayout`'s skip link, `LoginPage`'s outer wrapper and its
`<form>`, and `Field`'s label/control grouping - were left with no layout classes at
all. Confirmed against `specs/phase-2-login/mockups/mockup-1a.png` through `-1d.png`
via a live Playwright render at http://localhost:5173/login (screenshot:
`evidence/current-1a-idle.png`): the card isn't centered on the lavender
`--color-canvas-login` background (that token and `--radius-login-card` are already
declared in `theme.css` but were never consumed anywhere in `src`), field labels sit
inline with their inputs instead of stacked above them, the heading and subtext render
at plain body-text size (Tailwind v4's preflight resets heading font-size/weight), the
submit button is intrinsic-width instead of filling the card, invalid inputs carry no
danger-colored border, and the skip link is permanently visible instead of hidden until
focused.

Regression scope: no behavioral change. Every existing LoginPage/Field/Input/Button/
ApplicationLayout test (tab order, focus management, aria-invalid/aria-describedby
wiring, busy-state semantics, the five card states) must stay green untouched - this is
class additions only, no logic changes.

## Acceptance criteria

- AC1: the login page is centered on the `bg-canvas-login` background, matching
  mockup-1a's overall composition.
- AC2: each field's label renders above its control with mockup-sized type, not inline.
- AC3: the heading and subtext use mockup typography (bold 2xl heading, muted subtext).
- AC4: the submit button fills the card width, and stays that way through idle/ready/
  submitting/no-match states.
- AC5: an invalid field (no-match state) shows a danger-colored border, matching
  mockup-1d.
- AC6: the skip link is visually hidden until keyboard focus reaches it.
- AC7: no existing test's behavior/assertions change - the diff is additive classes and
  one new optional `Button` prop.

## Steps

1. Add the missing layout/typography classes across `ApplicationLayout`, `LoginPage`,
   `Field`, `Input` (width + invalid border), and a new `fullWidth` prop on `Button`;
   make each of the 8 already-red tests below green (the 9th - "does not stretch to
   full width by default" - already holds against unfixed code and stays a regression
   guard) - tests:
   - `src/shared/ui/Button.test.tsx::Button > renders at full width when fullWidth is set`
   - `src/shared/ui/Button.test.tsx::Button > does not stretch to full width by default`
   - `src/shared/ui/Field.test.tsx::Field > stacks the label above its control with a small gap`
   - `src/shared/ui/Input.test.tsx::Input > fills the width of its container`
   - `src/shared/ui/Input.test.tsx::Input > shows a danger border when the field context marks it invalid`
   - `src/app/layout/ApplicationLayout.test.tsx::ApplicationLayout > visually hides the skip link until it is focused`
   - `src/features/auth/LoginPage.test.tsx::LoginPage > centers the card on the login canvas background`
   - `src/features/auth/LoginPage.test.tsx::LoginPage > gives the heading bold mockup-sized typography`
   - `src/features/auth/LoginPage.test.tsx::LoginPage > renders the submit control at full width`

   (9 tests registered as one step per fix.md's S-size rule: repro and fix are one
   checkpoint, tests already observed red in Frame - `evidence/step1-red.txt`.)

## Verification

- `npm test` (full suite) green, zero regressions in the 33 pre-existing tests across
  the five touched files.
- Playwright: live render of `/login` at the mockup's viewport size for idle, filled,
  and no-match (invalid) states, screenshotted into `evidence/` and compared by eye
  against `specs/phase-2-login/mockups/mockup-1a.png`, `-1b.png`, `-1d.png`.
- `npm run lint`, `npm run typecheck`, `npm run build` clean (no VERIFICATION.md step
  is skipped; this loop reuses phase-1-setup's existing profile).
- `npm run e2e` (existing `e2e/login.spec.ts` and the rest of the suite) green -
  confirms no behavioral regression from the class-only diff.
