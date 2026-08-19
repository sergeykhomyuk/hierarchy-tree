# G4 Codex fix confirmation - login-visual-alignment (Codex-1)

Same thread as the original G4 Codex review, resumed via `codex exec resume --last`.

## Verdict

RESOLVED - [Card.tsx:14](/hierarchy-tree/src/shared/ui/Card.tsx:14) maps `radius="login"` to `rounded-login-card`, and [LoginPage.tsx:83](/hierarchy-tree/src/features/auth/LoginPage.tsx:83) now uses `max-w-[406px]` and `<Card radius="login">`.

Finding 2 remains confirmed and is accepted as-is; the new tests cover width/radius only, without addressing the previously identified test-tightness gaps.
