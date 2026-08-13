# Reference

Facts extracted from `task.md` and `hierarchy-tree-mockups.html`, recorded so no one has to derive them twice. This is raw material for the phase specs, not a plan. See [ROADMAP.md](../ROADMAP.md) for the plan.

## Database

- Base URL: `https://gongfetest.firebaseio.com`
- Firebase REST. Every path ends in `.json`. `GET /.json` returns the whole database; `GET /users/1/firstName.json` is the documented element-access example.
- Two top-level keys matter: `users` (flat collection, ~33 records, ~9KB) and `secrets` (map of secret to user id).
- The payload is public and contains plaintext passwords.
- If the data needs resetting: `https://9y9r481m5w.csb.app`, selecting the correct database domain.

The exact field names on a `users` record are unconfirmed. `task.md` names a first-name field, a photo field and a manager-id field, but the keys should be read from the live database before any schema is written.

## The encode function

Recovered from `task.md`. Login computes this client-side, then looks the result up at `GET /secrets/{secret}.json` to obtain a user id.

```js
const POISON_ARRAY = [156, 33, 64, 174, 120, 204, 69, 242, /* … 256 entries, values 0-255 … */];

function make32(inputString) {
  const targetLength = 32;
  let resultString = '';
  while (resultString.length < targetLength) {
    resultString += inputString;
  }
  resultString = resultString.substring(0, targetLength);
  return Array.from(resultString, (char) => char.charCodeAt(0));
}

function encode(email, password) {
  const emailChars = make32(email);
  const passwordChars = make32(password);
  let encodedResult = '';
  for (let i = 0; i < 32; ++i) {
    const index = (emailChars[i] ^ passwordChars[i]) & 0xff;
    const value = POISON_ARRAY[index];
    encodedResult += value.toString(16).padStart(2, '0').toUpperCase();
  }
  return encodedResult;
}
```

Output is a 64-character uppercase hex string.

### Extracting the lookup table

`task.md` renders its text with subset fonts using non-obvious glyph codes, so copy-paste and naive text extraction both produce garbage. To recover the 256-entry table reproducibly: inflate every `FlateDecode` stream in the PDF, collect the `(...) Tj` string operands, read them as 2-byte big-endian glyph codes, and translate through the `ToUnicode` CMap of the monospace font — the one mapping glyph 169 to `U+005E` and glyph 119 to `U+0026`. The array literal runs from the `const POISON_ARRAY = [` token to the closing `];`.

Validate before trusting the result: exactly 256 entries, every value in 0-255. A structurally correct `encode` producing the wrong bytes fails silently, so it also needs proving against one real account.

## Mockups

Open `hierarchy-tree-mockups.html` in a browser. Eight screens, each with an anchor id:

- Login: `1a` empty, `1b` filled and ready, `1c` submitting, `1d` error.
- Hierarchy: `1e` loaded with live toggles, `1f` loading, `1g` empty, `1h` error.

The mockups also show a decorative nav rail, a people/managers/roots summary line, per-row report counts and a "you" badge on the logged-in user. All four are in scope.

## Design tokens

Pulled from the mockup markup. Light theme; derive dark from the same token names and hold both to WCAG AA.

- Primary `#7B2BF0`, pressed `#6A22D6`, deep `#5B15C4`, tint `#EDE4FF`, tint hover `#F1EAFE`
- Nav rail `#240B4E`, login canvas `#F3EEFF`, app canvas `#F6F7F9`, surface `#fff`, row hover `#F7F5FD`, row selected `#F7F3FE`
- Ink `#1B1230`, muted `#55506B`, muted soft `#6A6A85` / `#7C7891`, faint `#8E8AA0`, placeholder `#A9A5B8`
- Hairline `rgba(36,11,78,.08)`, field border `#E2DDEE`, indent rail `#EAE6F3`, toggle border `#DCD7EA`
- Danger `#C81E4A` on `#FDE9EE`
- Radii: 6 toggle, 9-10 control, 14 card, 16 login card
- Font: Plus Jakarta Sans, weights 400/500/600/700/800
- Row metrics: 34px avatar, 20px toggle, 11px gap, 29px indent + 12px rail padding

## Package versions

Verified against the npm registry on 2026-08-12. Re-check before installing; these drift.

- Runtime: `react-router` 8, `zod` 4, `i18next` 26, `react-i18next` 17
- Styling: `tailwindcss` 4, `@tailwindcss/vite` 4
- Unit and component: `vitest` 4, `jsdom` 30, `@testing-library/react` 16, `@testing-library/user-event` 14, `@testing-library/jest-dom` 7, `@vitest/coverage-v8` 4, `axe-core` 4
- E2E: `@playwright/test` 1.62, `@axe-core/playwright` 4
- Lint: `eslint-plugin-boundaries` 7, `eslint-plugin-jsx-a11y` 6, `eslint-plugin-i18next` 6, `eslint-plugin-testing-library` 7, `eslint-plugin-playwright` 2
- Format: `prettier` 3, `prettier-plugin-tailwindcss` 0.8, `eslint-config-prettier` 10
- Budgets: `size-limit` 13, `@size-limit/preset-app` 13

Call axe through `axe-core` directly in a small test helper rather than adding a wrapper package; the popular ones are unmaintained.
