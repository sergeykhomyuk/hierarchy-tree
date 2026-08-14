# Cache - the withdrawn design, kept for later

**Status: not built, in any phase.** Withdrawn from the roadmap on 2026-08-13, during the G1 review of phase 1, before any code was written. This file is the whole design as it stood at withdrawal, so reintroducing it is a matter of reading one document rather than reconstructing a deleted argument from a diff.

Nothing here is binding. [ARCHITECTURE.md](./ARCHITECTURE.md) remains the binding document and [ROADMAP.md](./ROADMAP.md) the schedule; both now exclude caching. [GOAL.md](./GOAL.md) is silent on it and always was - it states what the app must do, not how, so it is not the source of this withdrawal. If this design is ever built, that decision is reopened in ARCHITECTURE.md's decision log first, in the same change.

## Why it was withdrawn

From ARCHITECTURE.md's decision log, verbatim:

> **No response cache in this roadmap** (2026-08-13, phase 1) - the earlier position was an own cache module over TanStack Query, on the grounds that dedupe, TTL and stale-while-revalidate are small enough to own. Specifying it proved otherwise: the state machine, per-key generations, revalidation cooldowns and their tests were the largest single piece of the phase 1 spec, and it exists to save one 9KB request on a dataset of 33 users. The cache is withdrawn from the roadmap, not designed and deferred - phases 1 to 3 ship without it and the repository per resource is the seam it attaches to afterwards. Rejected: TanStack Query, which is the same weight bought rather than written; and keeping the module in phase 3, which would land a cache and the tree domain in one loop.

The cost side of that trade is worth restating plainly, because it is the reason this file exists rather than a `git revert`: the design below survived two independent G1 reviews and four fix rounds. Ten findings were raised against it and resolved. What follows is post-review text, not a first draft, and the review history in the last section is the part that would be most expensive to rediscover.

## What the architecture used to say

The paragraph this replaced in ARCHITECTURE.md section 4, verbatim:

> Above it, a repository per resource maps raw JSON to domain types. Caching lives in one framework-agnostic module shared by loaders and components: in-flight request dedupe, TTL, and stale-while-revalidate. React Router's loader and the component's `use()` call read through the same cache, so there is exactly one place where freshness is defined.

The seam is unchanged by the withdrawal: a repository per resource still sits above the http client, and a cache attaches behind it without any caller changing.

## Behavior: the nine invariants

These were PRODUCT.md invariants 36 to 44 in `specs/phase-1-setup/PRODUCT.md`. Those numbers are **retired, not reused** - the phase 1 review record, `loop.json` and TECH.md's testing map all reference invariants by number, so 45 onward keep the identity they carry there. A loop that reintroduces caching writes new invariants under its own numbering and uses these as source material.

36. Caching lives in one module that imports no framework. It is usable from a router loader and from a component, and there is no second cache anywhere in the app.
37. Freshness is bound to the key, not to the call. A resource registry maps each cache-key namespace to its time-to-live, and `read` takes **no per-call TTL argument** - passing one is a compile error. A loader and a component reading the same key therefore cannot disagree about freshness, because neither of them supplies the number.
38. In-flight dedupe, the **no-value case**: N concurrent reads of a key that has no stored value produce exactly one transport call, and all N resolve with the same value. This invariant governs only that case; a read that finds a stored value is governed by invariants 39 and 40 and never joins an in-flight load.
39. TTL: a read within the entry's TTL returns the stored value and makes no transport call.
40. Stale-while-revalidate, the **value-present case**: a read that finds a stored value past its TTL returns that stale value immediately and triggers at most one revalidation. A further read arriving while that revalidation is in flight also returns the stale value immediately and starts no second call - it does not wait for the revalidation. A read after the revalidation completes returns the fresh value.
41. A failed revalidation leaves the stale value **and its freshness timestamp** untouched, and reports the failure through the observability facade. It never replaces good data with an error or an empty value, and it never makes stale data test as fresh. Instead it records a separate revalidation-cooldown timestamp: for 30000 ms after a failed revalidation, a read past the TTL returns the stale value and starts no revalidation. The first read after the cooldown expires revalidates again.
42. Cache keys are explicit and derived from the resource namespace and its parameters. An entry can be invalidated by key, and the whole cache can be cleared. Invalidation is generation-guarded: a load or revalidation that resolves **after** `invalidate(key)` or `clear()` cannot repopulate the cache. Readers already waiting on that in-flight load still receive its resolved value - they asked before the invalidation - but nothing is stored.
43. The cache is in-memory and per-app-instance. Nothing is written to `localStorage`, `sessionStorage`, IndexedDB or a service worker cache in this phase.
44. The cache is resettable between tests, and a test that populates it does not affect the next test.

## The layout entry

The block removed from TECH.md section 1's directory tree, verbatim. It sat under `src/platform/`, between `http/` and `observability/`:

```
      cache/
        create-resource-cache.ts
        cache-key.ts
        resource-registry.ts      namespace -> { timeToLive, revalidationCooldown }
        index.ts
```

Under the naming conventions the spec adopted after this was written, the same four modules are:

```
      cache/
        createResourceCache.ts
        createCacheKey.ts
        resourceRegistry.ts       namespace -> { timeToLiveMilliseconds, revalidationCooldownMilliseconds }
        cacheKey.ts               type CacheKey
        resourcePolicy.ts         type ResourcePolicy
        cacheEntry.ts             type CacheEntry - the six states below
        index.ts
```

The split into type modules is the only substantive difference: one public symbol per file, each named for its symbol, with the barrel re-exporting the public surface. `platform` importing only `platform` already holds, so the boundaries configuration needs nothing new.

## The design

Verbatim from TECH.md section 3.3 as it stood at withdrawal. Two things to reconcile before implementing:

- **File names.** The text below uses the original kebab-case names, mapped above.
- **The storage lint rule.** The `no-restricted-globals` entry for `localStorage`, `sessionStorage` and `indexedDB` referenced under invariant 43 below already exists - it outlived the cache and now sits under invariant 128, specified in TECH.md section 2.4. Reintroducing the cache does not reintroduce that rule.

The original text follows, unedited.

---

- `create-resource-cache.ts` exports `createResourceCache({ clock, observability, resourceRegistry })` returning `{ read, invalidate, clear, size }`. It imports no framework (invariant 36) and lives in a single module; the app constructs exactly one instance in `create-runtime.ts`.

**The resource registry (invariant 37).** Freshness is a property of the resource, not of the caller. `resource-registry.ts` exports a frozen record mapping each cache-key namespace to its policy:

```ts
export const resourceRegistry = {
  // phase 3 adds 'users'; phase 1 registers only the fixture namespace its tests use
  fixture: { timeToLiveMilliseconds: 30_000, revalidationCooldownMilliseconds: 30_000 },
} as const satisfies Record<string, ResourcePolicy>;
```

`read` takes NO per-call time-to-live argument - its signature is `read<Value>(key: CacheKey, load: () => Promise<Value>): Promise<Value>`, and the policy is looked up from the key's namespace. The namespace is typed `keyof typeof resourceRegistry`, so `createCacheKey('users', ...)` is a COMPILE ERROR until phase 3 adds the `users` row. That typing is load-bearing rather than decorative: with an untyped namespace, an unregistered lookup yields `undefined`, `now - storedAt <= undefined` is `false` on every read, and `now + undefined` is `NaN`, so the resource would silently never cache and never cool down instead of failing. A runtime `throw` on an unknown namespace backs the type for any dynamically constructed key. A loader and a component reading the same key therefore cannot disagree about freshness, because neither can express a disagreement. This is the whole content of invariant 37: the earlier per-call `{ timeToLiveMilliseconds }` parameter made the invariant unenforceable and made its check pass against the broken design, because both call sites did call the shared freshness function - with different arguments.

**The entry state machine.** An entry is exactly one of these states, and `read` behaves differently in each. Writing the states out is what resolves the apparent conflict between invariants 38 and 40: they describe different states, not the same one.

- `absent` - no entry. `read` creates a `loading` entry, calls `load()`, and stores the promise BEFORE its first `await`.
- `loading` - `{ status: 'loading', promise, generation }`, no value yet. A concurrent `read` returns the same `promise`. This is invariant 38's case: N readers, one transport call, all resolving to the same value. There is no value to return early, so nobody gets a stale read here. On resolution the entry becomes `fresh`; on rejection the entry is deleted and every waiter receives the failure.
- `fresh` - `{ status: 'settled', value, storedAtMilliseconds, generation }` with `now - storedAtMilliseconds <= timeToLiveMilliseconds`. `read` returns the value, no transport call (invariant 39).
- `stale` - the same record past its time-to-live, and past `revalidationCooldownUntilMilliseconds`. `read` returns the stored value immediately and starts at most one revalidation, moving the entry to `revalidating`. This is invariant 40's case (invariant 38 does not apply: a value is present).
- `cooling` - past its time-to-live but INSIDE `revalidationCooldownUntilMilliseconds`, because the last revalidation failed. `read` returns the stored value immediately and starts nothing. Naming it as a state matters: the list claims to be exhaustive, and without this entry an implementer transcribing the five states has no home for a cooling entry and will most likely fold it into `stale`, which reintroduces the hammering the cooldown exists to prevent.
- `revalidating` - `{ status: 'settled', value, storedAtMilliseconds, revalidation: Promise<void>, generation }`. `read` returns the stored value immediately and starts nothing, because a revalidation is already in flight. The `revalidation` slot is what bounds it to one.

- Failed revalidation (invariant 41): caught, reported through `observability.logger.warn`, and the entry is left genuinely untouched - `value` and `storedAtMilliseconds` are both unchanged, so a stale entry never tests as fresh. Back-off uses a SEPARATE field, `revalidationCooldownUntilMilliseconds = now + revalidationCooldownMilliseconds`, and during that window a read returns the stale value and starts no revalidation. The cooldown is a registered number per resource (30_000 ms, matching invariant 41), not the word "short". Reusing `storedAtMilliseconds` as the cooldown - the earlier design - would have made failed-to-refresh data indistinguishable from freshly-fetched data, which is the opposite of what invariant 41 asks for.
- Generations (invariant 42): generations are PER KEY, plus one cache-wide epoch for `clear()`. A single global counter would be wrong: bumping it on `invalidate('a')` would also invalidate an unrelated in-flight load for key `b`, silently discarding a write nobody asked to discard. Concretely, the cache holds `generations: Map<CacheKey, number>` and an `epoch: number`. A `load` or revalidation captures `(key, generations.get(key) ?? 0, epoch)` when it starts, and writes its result only if BOTH still match at settle time; otherwise the result is discarded and a debug record is emitted. `invalidate(key)` deletes the entry and increments that key's generation only. `clear()` empties the map and increments the epoch, which invalidates every in-flight write at once without touching per-key counters. Without this, a load that started before `invalidate(key)` and resolved after it would silently resurrect the deleted value. Waiters on an invalidated in-flight load still receive that load's value (they asked before the invalidation); what they do not do is repopulate the cache with it. The test for this asserts both directions: invalidating `a` discards `a`'s late write, AND leaves `b`'s concurrent write intact.
- Keys (invariant 42): `cache-key.ts` exports `createCacheKey(namespace, resourcePath, searchParameters?)` producing `` `${namespace}:${resourcePath}?${sortedEncodedParameters}` `` - deterministic under parameter reordering, and carrying the namespace the registry is keyed by. `invalidate(key)` and `clear()` are the only mutation entry points.
- In-memory only (invariant 43): a plain `Map` in a closure. No storage API is imported anywhere in `src`; an added `no-restricted-globals` entry for `localStorage`, `sessionStorage` and `indexedDB` makes that a lint failure in this phase, and phase 2 removes the `sessionStorage` entry with a decision-log line.
- Resettable (invariant 44): the cache is created per runtime, and tests create a runtime per test. `clear()` exists for the loader-level case.

## The test plan

Verbatim from TECH.md's "Testing and validation" section. Each entry was written to fail against a specific broken implementation rather than to describe the happy path, and several were strengthened during review precisely because the first version passed against a broken design (37 and 42 especially).

- 36 - unit + lint: a test asserting the module's import graph contains no `react`; the boundaries rule keeps it in `platform`.
- 37 - unit + typecheck: `read`'s signature accepts no time-to-live argument, asserted by a `@ts-expect-error` test that passes one. That is what discriminates - the previous check ("the freshness function is exported and both read paths call it") passed against the broken per-call design, because both paths did call it, with different arguments. A second test drives a loader-shaped read and a component-shaped read of the same key at the same clock time and asserts identical freshness decisions, which is now guaranteed by construction rather than by convention.
- 38 - unit: the NO-VALUE case. N concurrent reads of a cold key produce one transport call and all N resolve with the same value. A test also asserts the rejection path: a failed cold load deletes the entry and rejects every waiter, leaving no poisoned in-flight slot behind.
- 39, 40 - unit: fake-clock-driven sequences over the state machine of section 3.3, asserting call counts AND which value each read returned. 40's case is value-present: a read past the time-to-live returns the STALE value synchronously while starting exactly one revalidation, and a further read during that revalidation returns the stale value and starts nothing. Asserting the returned value, not only the call count, is what stops the 38 and 40 tests from contradicting each other.
- 41 - unit: a failing revalidation leaves BOTH `value` and `storedAtMilliseconds` unchanged - the test reads the entry's stored-at through a test-only accessor and asserts it did not move - emits a warning record, and sets the separate cooldown field. A follow-up read inside the cooldown window asserts stale value returned and zero transport calls; a read after it asserts a revalidation starts.
- 42 - unit: key determinism under parameter reordering; `invalidate` and `clear`. Plus the generation test that gives the invariant teeth: start a load, call `invalidate(key)` while it is in flight, resolve the load, and assert the cache is still empty and the waiter still received the value. Without generations that load repopulates the cache with data the caller just invalidated.
- 43 - lint: `no-restricted-globals` for the storage APIs, plus an e2e assertion that `localStorage.length` and `sessionStorage.length` are 0 after visiting both routes.
- 44 - unit: a per-test runtime factory; a test populating the cache followed by a test asserting an empty cache.

## Review history: the ten findings this design absorbed

Two independent G1 reviewers (a fresh Claude spec-validator and Codex) raised these against the cache across four fix rounds. Every one is already resolved in the design above - they are recorded here as the traps, not as open work. An implementation that departs from the design should check itself against this list, because each entry is a way the obvious implementation goes wrong.

- **Claude-1** (blocking) - Cache TTL is a per-call argument, so two callers of one key can disagree about freshness - invariant 37 unenforced, and its named check passes against the broken implementation (PRODUCT 37 vs TECH 3.3)
- **Claude-2** (blocking) - Invariants 38 and 40 contradict for a read arriving during revalidation; both have unit checks, one is unwritable
- **Claude-23** (non-blocking) - Failed-revalidation cool-down mutates storedAtMilliseconds, making stale data test as fresh; 'left untouched' and 'refreshed' contradict in one sentence; duration is 'short', not a number
- **Claude-32** (non-blocking) - Fix-round: the state enumeration claims exhaustiveness but has no state for an entry past TTL and inside the cooldown (converges with Codex-18 on the duration)
- **Claude-41** (non-blocking) - Fix-round: binding TTL to the key enforces invariant 37 only for REGISTERED namespaces; an unregistered one yields undefined TTL, making every read stale and the cooldown NaN
- **Codex-3** (blocking) - The cache entry shape cannot represent the initial in-flight request invariant 38 requires it to dedupe: on a cold miss there is no value-bearing entry to hang the promise on
- **Codex-4** (blocking) - Invalidation has no generation or cancellation semantics, so a load resolving after invalidate() can restore the deleted value
- **Codex-5** (blocking) - Failed revalidation changes the freshness timestamp and therefore presents stale data as fresh (converges with Claude-23)
- **Codex-18** (blocking) - Fix-round regression: the cache revalidation cooldown is 30000ms in PRODUCT 41 and 10000ms in TECH's registry and state machine
- **Codex-19** (blocking) - Fix-round regression: a single global generation counter means invalidating key A discards an unrelated in-flight write for key B; per-key generations are needed

## Two questions this design answered

Both were settled with the user on 2026-08-13 and are recorded in PRODUCT.md's open-questions section as moot:

- **What does a read see during a revalidation, and what does a failed revalidation do to freshness?** The stale value immediately, with no second call; a failed revalidation touches no freshness timestamp and opens a 30000 ms cooldown.
- **What happens to an in-flight load when `invalidate` or `clear` runs?** It is generation-guarded: waiting readers receive the value they asked for, and the cache stores nothing.

## If this is ever built

The order that made sense at withdrawal, and still does:

1. Reopen the decision in ARCHITECTURE.md's decision log, in the same change. Section 4 ("Data access"), section 7 ("Deliberately not built") and ROADMAP.md's "Not in scope" entry all currently say there is no cache, and all three move together.
2. Write new invariants from the nine above, under fresh numbers, in the spec of whichever loop owns the work.
3. Build it behind the repository per resource, so no caller changes. That is the seam the whole withdrawal rests on, and it is what keeps this a self-contained addition rather than a refactor.
4. Add `platform/cache` to the layer layout. The boundaries configuration needs no change: `platform` already imports only `platform`.
5. No dependency is added, so the runtime allow-list of invariant 134 and the entry budget are untouched.
6. The injected clock this design needs - `platform/runtime/clock.ts`, `createSystemClock.ts` and the manually-advanced `createFakeClock` of TECH.md section 6.1 - is already part of phase 1, built for the http client's deadline and backoff. Once phase 1 has landed, the cache's fake-clock tests can use it as it stands; no timer seam has to be invented for them.
