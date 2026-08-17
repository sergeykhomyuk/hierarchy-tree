# Proof of completion: login-visual-alignment

## Task

The login page's behavior shipped correctly in the prior `phase-2-login` loop, but its
Tailwind CSS classes for layout and typography were incomplete: `ApplicationLayout`,
`LoginPage`'s outer wrapper/form, and `Field`'s label/control grouping carried no layout
classes at all, while `Card`, `Input`, `Button` and `ProductMark` already had their own
styling. Root cause confirmed via a live Playwright render of `/login` compared against
`specs/phase-2-login/mockups/mockup-1a.png` through `-1d.png`: no centering/background,
inline labels instead of stacked, unstyled heading/subtext, non-full-width submit
button, no invalid-border color, a permanently-visible skip link, and (found in G4
review, round 2) a card 22px narrower than the mockup with the wrong border radius. All
gaps fixed with additive Tailwind classes and two small, backward-compatible prop
additions (`Button.fullWidth`, `Card.radius`) - no behavioral change.

## Requirements -> evidence

- AC1 (card centered on `bg-canvas-login`, matching mockup-1a's composition, correct
  width/radius):
  - Test: `src/features/auth/LoginPage.test.tsx::LoginPage > centers the card on the
    login canvas background` - passing
  - Test: `src/features/auth/LoginPage.test.tsx::LoginPage > sizes the card to the
    mockup width and uses the login card radius` - passing
  - Test: `src/shared/ui/Card.test.tsx::Card > uses the login card radius when radius
    is set to login` - passing
  - e2e/visual: `evidence/fixed2-1a-idle.png` - pixel-exact match to
    `specs/phase-2-login/mockups/mockup-1a.png` (card spans x=59-462, 404px wide, in
    both images across 6 sampled rows; measured with Pillow, not eyeballed)

- AC2 (label above control, mockup-sized type):
  - Test: `src/shared/ui/Field.test.tsx::Field > stacks the label above its control
    with a small gap` - passing

- AC3 (heading/subtext typography):
  - Test: `src/features/auth/LoginPage.test.tsx::LoginPage > gives the heading bold
    mockup-sized typography` - passing
  - e2e/visual: `evidence/fixed-1a-idle.png`, `evidence/fixed2-1a-idle.png`

- AC4 (submit button full width, all states):
  - Test: `src/features/auth/LoginPage.test.tsx::LoginPage > renders the submit control
    at full width` - passing
  - Test: `src/shared/ui/Button.test.tsx::Button > renders at full width when
    fullWidth is set` / `> does not stretch to full width by default` - passing

- AC5 (invalid field danger border):
  - Test: `src/shared/ui/Input.test.tsx::Input > shows a danger border when the field
    context marks it invalid` - passing
  - e2e/visual: `evidence/fixed-1d-nomatch.png` - matches
    `specs/phase-2-login/mockups/mockup-1d.png`

- AC6 (skip link hidden until focused):
  - Test: `src/app/layout/ApplicationLayout.test.tsx::ApplicationLayout > visually
    hides the skip link until it is focused` - passing

- AC7 (no existing test's assertions changed):
  - Verified by diff review (both reviewers confirmed no assertion/test-name changes,
    only additive tests and mechanical lint/format edits logged as approved-change
    entries)

## Verification summary

- Full suite: `npm test` -> 430/430 green (`evidence/step2-full-suite.txt`)
- `npm run verify` (typecheck + lint + format:check + test:coverage + build +
  verify:build + size) -> clean, round 2 (`evidence/g3-verify-round2.txt`)
- `npm run e2e` -> 41/41 green, round 2, including axe zero-violations on `/login` in
  all five card states, RTL mirroring, dev-console hygiene
  (`evidence/g3-e2e-round2.txt`)
- Traces/screenshots: `specs/login-visual-alignment/evidence/` (`current-1a-idle.png`
  pre-fix, `fixed-1a-idle.png`/`fixed-1b-ready.png`/`fixed-1d-nomatch.png` round 1,
  `fixed2-1a-idle.png` round 2 - pixel-verified against the mockup)

## Reviews

- Claude fresh-context review (`agentic-loop:loop-reviewer`, full diff pasted): 1
  non-blocking finding (Claude-1, cosmetic double-space) - fixed
  (`evidence/reviews/g4-claude.md`)
- Codex second opinion (`codex exec`, fresh thread, read-only sandbox, full diff + file
  paths): 2 findings - Codex-1 (blocking: card width/radius mismatch vs mockup) fixed
  and confirmed RESOLVED by the raiser on the same thread; Codex-2 (non-blocking: test
  strength gaps) accepted as-is by the user (`evidence/reviews/g4-codex.txt`,
  `evidence/reviews/g4-codex-confirm.md`)
- Security pass: not flagged for this loop (pure CSS/markup styling change, no new
  data flow, no auth/input-parsing surface touched)

## Known limitations / accepted findings

- Codex-2 (accepted): the new visual tests would still pass if `min-h-screen`, the
  field gap, subtext classes, or full-width-while-busy were removed, and the skip-link
  test checks class tokens rather than actual focused-state computed visibility. User's
  reason: the underlying behavior is already covered by the e2e axe scans and manual
  pixel-verified screenshot comparison; tightening every unit assertion is
  disproportionate for an S-size visual fix.
