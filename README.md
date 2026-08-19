# Hierarchy Tree

A React and TypeScript implementation of the supplied [front-end exercise](./docs/task.md).
Users sign in and view the company's complete organizational hierarchy as an expandable,
keyboard-accessible tree.

[View the deployed application](https://hierarchy-tree.pages.dev/)

> [!WARNING]
> The exercise API does not provide real authentication. See [Security](#security) before
> entering any credentials.

## Run locally

The project requires Node `24.15.0`, pinned in [`.nvmrc`](./.nvmrc).

```sh
nvm use
npm ci
npm run dev
```

The development server is available at `http://localhost:5173`.

To run a production build locally:

```sh
npm run build
npm run preview
```

The application uses public defaults without requiring a local environment file. Available
settings for the API URL, request timeout, logging, observability, and development features
are documented in [`.env.example`](./.env.example).

## Verification

```sh
npm run verify
npm run e2e
```

- `npm run verify` runs type checking, linting, formatting checks, unit and component tests
  with coverage, a production build, built-output assertions, and bundle-size checks.
- `npm run e2e` runs Playwright against the built application served with Vite Preview.
- `npm run smoke:live` checks the real exercise API and is kept outside the local and CI gates
  because it depends on a third-party service.
- `npm run e2e:deployed` runs the deployed smoke tests against the production hostname.

CI runs `verify` and Playwright for every pull request and every push to `main`. A successful
push to `main` deploys the verified build to Cloudflare Pages. See
[`VERIFICATION.md`](./VERIFICATION.md) for the complete command reference and evidence model.

## Implementation highlights

- **Accessible hierarchy:** the tree implements the ARIA tree keyboard model, visible focus
  states, semantic position metadata, reduced-motion support, and light/dark WCAG AA themes.
  Accessibility is checked with axe in component tests and real-browser Playwright tests.
- **Predictable navigation:** unauthenticated routes are guarded before their data loaders run.
  The signed-in session survives reloads through `sessionStorage` and expires with the tab.
- **Shareable tree state:** the first two hierarchy levels open by default, and expansion state
  is stored in the URL so a reload or shared link restores the same view.
- **Defensive data handling:** API responses are validated with Zod. Invalid records are
  isolated where possible, while unusable responses produce explicit empty or error states.
- **Observable failure paths:** requests and meaningful interactions carry correlation IDs
  through a redacting observability facade.
- **Feature boundaries:** authentication and hierarchy code own their domain, data, UI, and
  routing concerns. Browser APIs and time are accessed through replaceable runtime adapters.
- **Internationalization:** user-visible strings pass through i18next, including loading,
  empty, and error states. A test locale makes untranslated strings visible in automated tests.

## Intentional deviation from the task

- **Visible expansion state:** the task asks for a `+` for managers, including as the control
  used to toggle their branches. This implementation changes it to `-` while a manager is
  expanded and restores `+` when collapsed; leaf users keep a static `-`. Always showing `+`
  could suggest that an already expanded branch can be expanded again, so reflecting the
  current state makes the control's behavior clearer.

## Development process

Development was organized through a custom agentic dev loop (`/dev`) rather than ad hoc
prompting. For each task, the loop records its state under `specs/<task>/loop.json` and moves
through fixed phases and gates:

- **Frame and plan:** classify the task as `feature`, `fix`, `troubleshoot`, `refactor`,
  `chore`, `spike`, or `perf`; size it as `XS`, `S`, `M`, or `L`; then define its scope,
  acceptance criteria, and implementation plan. Larger tasks pass a specification review at
  `G1`.
- **Test-driven implementation (`G2`):** name the relevant test, observe it fail, implement the
  smallest change, and record the passing result.
- **Full verification (`G3`):** run the complete suite, browser checks, and any task-specific
  manual verification while retaining the evidence.
- **Independent review (`G4`):** review the complete diff in fresh contexts, record each
  finding, and either fix it or explicitly accept it with a reason.
- **Completion proof (`G5`):** map every acceptance criterion to concrete evidence in
  `PROOF.md` before closing the loop.

The loop is a deterministic workflow: its state machine decides which gate comes next and
prevents validation steps from being skipped. The plans, reviews, test logs, screenshots, and
completion evidence remain in each task's directory under `specs/`.

It is also a self-improving loop. Execution traces and decisions are retained, then examined
in retrospective sessions to identify recurring problems and propose improvements to the
workflow, skills, and tooling. Those changes are run through dedicated dogfood sessions before
adoption, so the same loop provides evidence that its improvements work in practice.

### Related skills

Three development skills define the project's working conventions and are loaded before
relevant implementation work:

- `/coding` - baseline discipline: understand the existing code, keep changes focused, and
  define verifiable completion criteria.
- `/react-coding` - React conventions for component structure, memoization, logic isolation,
  props, and accessibility.
- `/typescript-coding` - TypeScript conventions for type safety, naming, module organization,
  and constants.

## Project documentation

- [`docs/task.md`](./docs/task.md) - original exercise brief.
- [`specs/GOAL.md`](./specs/GOAL.md) - requirements the implementation is held to.
- [`specs/ARCHITECTURE.md`](./specs/ARCHITECTURE.md) - architecture, trade-offs, and decision
  log.
- [`specs/ROADMAP.md`](./specs/ROADMAP.md) - delivery phases and their verification status.
- [`specs/hierarchy-tree-mockups.html`](./specs/hierarchy-tree-mockups.html) - interactive UI
  mockups created before implementation.

## Security

The sign-in screen demonstrates a login flow; it does not authenticate users securely. The
client derives a lookup key from the entered email and password and queries a public,
unauthenticated Firebase database. The API issues no session, applies no access control, and
exposes its data - including plaintext passwords - to anyone with the database URL.

Treat this application as a demo only. Never enter a password used for any real account.
