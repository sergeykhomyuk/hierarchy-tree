# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Read first

- [GOAL.md](./GOAL.md) - what the app must do. The feature scope is closed: if it is not in GOAL.md, do not build it.
- [ARCHITECTURE.md](./ARCHITECTURE.md) - how it is built and why. Every technical decision is already made and recorded there.

Treat both as binding. If a task seems to require deviating from ARCHITECTURE.md, say so and ask before writing code; if the deviation is right, update the decision log in the same change.

## Skills

Invoke these for any implementation work, together, before writing code:

- `/coding` - baseline discipline for every change: understand first, keep the diff minimal, define what "done and verified" means.
- `/typescript-coding` - type safety, naming, module organization, constants. Any `.ts` work.
- `/react-coding` - memoization, component structure, logic isolation, props, accessibility. Any `.tsx` or custom hook.

## Core principles

- **The brief bounds the features, not the engineering.** Depth goes into how the requested behavior is built - never into unrequested features.
- **Boundaries are enforced, not suggested.** `app` composes, `features/*` own a slice end to end behind a single entry, `shared` is domain-free, `platform` adapts the outside world. No cross-feature imports, no deep imports. Lint failures on this are design feedback, not obstacles.
- **Domain logic stays pure.** Tree building and flattening are framework-free, synchronous, and fully tested. Nothing in the domain layer imports React.
- **Validate at the boundary, tolerate bad rows.** External JSON is parsed with Zod before it becomes a domain type; a malformed row is dropped and reported, never allowed to crash a page.
- **Every data surface has four states.** Skeleton, error with recovery, empty, data. A component that only handles the happy path is unfinished.
- **Accessibility is part of the definition of done.** The tree implements the full ARIA tree keyboard contract. Assert it in tests rather than claiming it in prose.
- **No user-visible string in code.** Strings live in i18next catalogues; dates, numbers and lists format through `Intl`.
- **Instrument what you build.** Requests, errors and meaningful interactions go through the observability facade with a correlation id. Never log or transmit secrets, passwords or tokens.
- **Prefer platform and React primitives over dependencies.** A new runtime dependency needs a reason that survives the bundle budget.
- **Tests are the evidence.** Pure domain near 100%, components by behavior and keyboard, e2e against Playwright route mocks including failure paths. Do not report work as done on an unrun suite.

## Working agreements

- Ask one clarifying question when a task is ambiguous; do not guess at scope.
- Keep diffs surgical and reviewable. Refactors that were not asked for belong in their own change.
- Verify versions and APIs from `package.json` or the registry, never from memory.
- Report honestly: if a check failed or a step was skipped, say which and why.

## Commands

- `npm run dev` - Vite dev server
- `npm run build` - typecheck and production build
- `npm run lint` - ESLint

Test, format, e2e and budget scripts arrive with their toolchain; check `package.json` for the current set rather than assuming.
