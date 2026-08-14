# Roadmap

What gets built, in what order, and how each phase proves it is done. Three phases.

The goal is in [GOAL.md](./GOAL.md), the technical decisions are in [ARCHITECTURE.md](./ARCHITECTURE.md), the screens are in [docs/hierarchy-tree-mockups.html](./docs/hierarchy-tree-mockups.html), and the facts already extracted from the brief are in [docs/reference.md](./docs/reference.md). This file stays above all of that: goals and outcomes, not tasks.

## Status

- **Phase 1 - Project setup**: done (6/6 outcomes, 3/3 exit criteria)
- **Phase 2 - Login page**: IN PROGRESS - specs written and under validation (0/6 outcomes, 0/4 exit criteria)
- **Phase 3 - Hierarchy Tree page**: not started (0/6 outcomes, 0/5 exit criteria)

**Next up**: finish phase 2's spec validation, then execute its four milestones.

**Last updated**: 2026-08-14 - phase 1 closed; phase 2 specified, and sign-out moved into it from phase 3

## How to use this

- Each phase gets its own detailed spec before work on it starts. This file records what the phase is for and how it will be judged; the spec records how to do it.
- `GOAL.md` and `ARCHITECTURE.md` stay binding. This file orders the work; it does not re-open decisions. If a phase appears to require deviating from `ARCHITECTURE.md`, stop and ask, then update the decision log in the same change.
- Phases run in order. Each assumes the one before it is complete.
- A phase is done when its exit criteria pass on a suite you actually ran. An unrun suite is not evidence.

### Recording progress

- Tick an outcome or exit criterion only when it is done *and* verified. Half-done stays unticked.
- A phase that is underway but incomplete gets `IN PROGRESS -` on the outcome being worked, naming what remains. A blocked one gets `BLOCKED -` with the reason and what would unblock it. Do not tick around a blocker; leave it visible.
- Update the **Status** board in the same edit: counts, what is next, and the last-updated line.
- Append a line to the **Progress log** when a phase closes, or when something happens that a later reader would need to know. That log is how a fresh agent reconstructs what happened without reading the diff.
- If reality diverges from what a phase promised, edit the phase and say so in the log. A roadmap that lies is worse than no roadmap.

---

## Phase 1 - Project setup

**Goal**: a deployable, fully instrumented skeleton with no features in it, so that later phases only ever add feature code and always land green.

Everything expensive to retrofit happens here: the layer boundaries, the platform adapters, the design system, and the whole quality pipeline. Getting this wrong is what turns phases 2 and 3 into rework.

**Outcomes**

- [x] The four layers exist and the import rules between them are enforced by lint, not by convention
- [x] The platform layer adapts the outside world: configuration, HTTP, observability, i18n
- [x] A shared, domain-free UI kit carries the mockups' visual language in both light and dark
- [x] The router, provider stack and root error boundary compose a placeholder app
- [x] The full quality pipeline runs in CI: types, lint, formatting, unit tests, e2e, size budgets
- [x] `main` deploys itself, so review starts with a URL rather than an install

**Exit criteria**

- [x] Every pipeline check passes locally and in CI
- [x] A deliberate cross-feature import fails lint (demonstrated, then reverted)
- [x] The deployed URL renders a placeholder login route

---

## Phase 2 - Login page

**Goal**: a user signs in with their email and password and arrives at the hierarchy page; a failed attempt tells them so without guesswork.

Screens `1a`-`1d`, plus `1e`'s header. The interesting risk here is the credential derivation recovered from the brief — it is easy to port in a way that looks right and produces the wrong bytes.

**Outcomes**

- [ ] The credential-to-secret derivation is ported and proven against a real account, not just unit-tested for shape
- [ ] Signing in looks up only the secret; the user table, with its plaintext passwords, is never fetched to authenticate
- [ ] A session survives a reload, dies with the tab, and holds nothing sensitive
- [ ] Access control runs before data fetching, and returns the user to where they were headed
- [ ] The login page renders all five of its states
- [ ] The header names the signed-in user and signs them out, and the back button cannot undo it

**Exit criteria**

- [ ] A real credential signs in and lands on the hierarchy page; a wrong one stays put and says why
- [ ] The states match the mockups, with the one deliberate deviation recorded
- [ ] No credential material reaches any URL, log line, telemetry event or storage entry - asserted, not eyeballed
- [ ] Full pipeline green

---

## Phase 3 - Hierarchy Tree page

**Goal**: the complete organizational tree, shown to every user regardless of who is signed in, fully operable from the keyboard and unbothered by bad data.

Screens `1e`-`1h`. This is where the depth goes: the tree domain is pure and heavily tested, and the widget honours the accessibility contract it claims.

**Outcomes**

- [ ] Tree construction is pure, framework-free and exhaustively tested, including multiple roots, missing managers and cycles
- [ ] A malformed record is dropped and reported rather than taking the page down
- [ ] The page renders all four of its states
- [ ] Expand and collapse survive a refresh, a shared link and the back button
- [ ] The tree implements the full ARIA tree keyboard contract, asserted in tests rather than claimed in prose
- [ ] `README.md` describes this project rather than the Vite template, and the decision log reflects anything that deviated

**Exit criteria**

- [ ] The full tree renders from the live database, with multiple roots, correct nesting and correct manager detection
- [ ] Toggles work by mouse and by keyboard; the tree is a single tab stop; accessibility checks pass on rendered pages
- [ ] All four states are reachable in e2e, failure paths included
- [ ] Expansion state survives a refresh and the back button
- [ ] The whole pipeline is green and `main` is deployed

---

## Not in scope

Carried from `ARCHITECTURE.md` section 7 so that reading only this file does not lead somewhere it should not. Each omission is a decision, with the seam that makes it cheap later.

- **Virtualized rendering** - unnecessary at 33 rows; the tree domain already emits the row model a windowing layer consumes.
- **Real authentication** - impossible against this API from a static client. The auth feature isolates the lookup so a server-issued cookie replaces one module.
- **Offline and service workers** - a 9KB public payload does not justify a cache lifecycle. The repository layer is where a persistent cache would attach.
- **Response caching** - in-flight dedupe, TTL and stale-while-revalidate. Withdrawn from the roadmap on 2026-08-13: the design cost more than the one 9KB request it saves. Every phase fetches through the http client directly, and the repository per resource is the seam a cache attaches behind later. The withdrawn design is kept in [CACHE.md](./CACHE.md) for whenever that is worth doing.
- **Search, filtering, org editing** - the tree domain already returns the row model a filter would narrow, but none of this is asked for.
- **A second *product* locale, SSR, a component library** - the infrastructure supports each; none is needed. (A test-only locale for unit/e2e assertions ships separately - see ARCHITECTURE.md's decision log.)
- **Vendor telemetry** - the observability facade defines the contract; a real sink is a one-line swap.

---

## Progress log

Newest last. One line per phase closed, or per event a later reader would need to know: date, what happened, evidence, commit sha.

- 2026-08-13 - roadmap created from GOAL.md, ARCHITECTURE.md and the mockups. The database URL, the credential derivation and the design tokens were extracted from `docs/task.md` and recorded in `docs/reference.md`; package versions verified against the npm registry.
- 2026-08-13 - two scope changes made while specifying phase 1, both recorded in ARCHITECTURE.md's decision log. Response caching is withdrawn from the roadmap (the design outweighed the single 9KB request it saves), so `platform/cache` is not built in any phase. Deployment moves from GitHub Pages to Cloudflare Pages, because the repository is private; the site now serves at the root, so the Vite base is `/` and SPA deep links come from a `_redirects` rule rather than a `404.html` copy.
- 2026-08-14 - phase 1 closed. All six outcomes and all three exit criteria verified against `specs/phase-1-setup/PROOF.md`; the loop merged in PR #3, with two follow-on loops merged behind it - `i18n-test-locale` (PR #4, a key-echoing test locale so unit and e2e assertions check the real catalogue's shape instead of a hand-maintained copy of its prose) and `phase-1-conventions` (PR #5, aligning the code with the react-coding and typescript-coding conventions). The deployed URL serves the placeholder login route from Cloudflare Pages.
- 2026-08-14 - phase 2's scope widened while framing it, on the user's decision: signing out ships with the login page rather than with the tree. The header carrying the signed-in user's name and the logout link, and the guarantee that the back button cannot return to an authenticated view, move from phase 3's outcome list into phase 2's. Phase 3 keeps the tree and nothing else of that. Three further framing decisions shaped phase 2's spec and are recorded in `specs/phase-2-login/PRODUCT.md`: the failed-sign-in state shows one summary alert rather than mockup 1d's field-level "Incorrect password" line, because the derivation collapses both fields into a single secret and a null lookup cannot attribute the failure to either; a transport failure is a fifth state, distinct from "no user matches", with its own retry and correlation id; and the email is trimmed but never lowercased, because the derivation depends on the exact characters.
