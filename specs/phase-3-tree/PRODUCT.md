# Product spec: phase-3-tree - the hierarchy tree page

## Summary

A signed-in user opens `/` and sees the whole organization as a tree: every user, nested
under their manager, with a badge, a name and an email on each row. Managers expand and
collapse, the shape of the tree survives a refresh and a shared link, and the whole widget
is operable from the keyboard as a WAI-ARIA tree. Bad rows in the database are dropped and
reported rather than allowed to take the page down.

> **Cross-references in this document are by description, not by number.** The G1 grill
> found five citations pointing at the wrong invariant after an earlier renumber. Numbers
> remain the reference system for PLAN.md steps and PROOF.md entries - which are written
> once, against a frozen document - but no invariant here cites another invariant by number,
> so a future renumber cannot silently corrupt one. (The closing sections cite the numbered
> deviation list, which renumbering invariants does not touch.)

## User stories

**Someone new to the company** opens the app and reads the org chart. They see three roots,
they can walk down any branch, and the first screen already shows the shape of the
organization without a single click.

**A signed-in user looking for a colleague** collapses the branches they do not care about,
finds the person, and sends the URL to someone else. That link opens with the same branches
open, because the expansion state travels in the URL.

**A keyboard-only user** tabs once to reach the tree and then never touches the mouse:
arrows move and open and close, Home and End jump to the ends, typing a name jumps to it.
Their screen reader announces each row's level, its position among its siblings and whether
it is open.

**Whoever is on call** when the shared public database changes shape gets a page that still
renders, a console that says how many rows were dropped and why, and a correlation id that
ties the failure to a request - instead of a white screen.

**A reviewer** reads `README.md` and learns what this project is, which is not what the Vite
template said.

## Behavior (numbered invariants)

"The tree" means the widget; "the forest" means the domain structure it renders; "a row"
means one visible `treeitem`; "a person" means one validated user record.

### Scope

1. The page renders the complete forest built from every user in the database, identical
   for every signed-in user. Nothing on this page filters, sorts by, or hides anything
   based on who is signed in.
2. The only thing the signed-in identity changes on this page is which single row carries
   the "you" marker and what the header shows - and the header is phase 2's, unchanged here.
3. The page is reachable only when signed in. The guard, the redirect, the header and
   signing out come from phase 2 and are neither re-specified nor modified here. Phase 2's
   branch has already moved the sign-out outcome out of `ROADMAP.md`'s phase 3 list into
   phase 2's; this branch inherits that edit at the rebase, and no invariant here asserts
   anything about signing out.
4. This page issues exactly one request of its own: the users read. Photo badges cause the
   browser to load images from third-party hosts, which is a consequence of rendering an
   `img` the database points at, not a request this page makes through the HTTP client. The
   two rules are separate and both are tested separately: one client request, and image
   loads to whatever hosts the data names.
5. Nothing on this page mutates the database. There is no create, edit, delete, reassign or
   drag-and-drop surface.

### Building the forest (pure domain)

6. `buildForest` takes the validated person list and returns the ordered roots, each node
   carrying its person and its ordered children, plus the anomalies it found and the counts
   the summary line needs.
7. Anomalies are **returned as data**, never logged from inside the domain. The caller
   reports them. This is what keeps the domain pure while still making a shape change in the
   shared database visible.
8. A person with no `managerId` is a root.
9. A person whose `managerId` matches the `id` of another person in the list is that
   person's child.
10. A person whose `managerId` matches no `id` in the list is a root, and the dangling
    reference is counted as an anomaly. They are never dropped: a person with a broken
    manager reference still appears in the tree.
11. A person whose `managerId` equals their own `id` is a root, and the self-reference is
    counted as an anomaly. They do not appear as their own child.
12. When a set of people forms a cycle (a → b → a, or any longer ring), the cycle is broken
    rather than followed: the ring member appearing earliest in the list becomes a root, and
    every other member keeps its manager edge. The break is counted as an anomaly.
13. Because a person has at most one manager, the manager relation is a function, so rings
    are disjoint and the earliest ring member is always unique. Cycle-breaking is therefore
    deterministic: the same list always produces the same forest.
14. Building the forest terminates on every input. No input - a ring of length 1, 2 or 33 -
    can make it recurse without bound or hang the page.
15. Two people with the same `id` cannot both be kept: the first occurrence **in the
    validated list** wins, later duplicates are dropped, and the drop is counted as an
    anomaly. Children pointing at that id attach to the survivor.
16. "First occurrence in the validated list" is stated deliberately: invalid rows are
    dropped before the forest is built, so if a payload holds an invalid record and a valid
    record sharing one id, the valid one survives.
17. Roots appear in payload order.
18. Children appear in payload order within their parent.
19. Ordering never depends on name, email, id value, subtree size or manager status.
20. A person is a **manager** when at least one other person reports to them directly.
    Reporting indirectly does not make someone a manager of that person.
21. A node's **report count** is its number of direct children, never its subtree size.
22. An empty person list produces an empty forest - zero roots - which is a legitimate
    result, not an error.
23. A list where every person is a root produces that many single-node roots; a list of one
    person produces one root with no children.
24. The domain is pure and synchronous: same input, same output, no clock, no randomness,
    no network, no storage, no React, no logging.
25. `buildForest` visits each person a bounded number of times; it is linear in the number
    of people, not quadratic.
26. Building the forest never mutates the array or the objects handed to it.

### The visible row model

27. `flattenVisible` takes the forest and the set of expanded node ids and returns the
    ordered rows to render.
28. Rows come out in pre-order depth-first order: a node, then its visible descendants,
    then its next sibling.
29. A node's children are included only when that node is in the expanded set. A collapsed
    node's whole subtree is absent from the row list, at every depth.
30. Every row carries: the person, `depth` (0 for a root), `hasChildren`, `isExpanded`,
    `setSize`, `posInSet` and the direct report count.
31. `setSize` is the number of siblings the row has at its own level under the same parent,
    including itself; for a root it is the number of roots.
32. `posInSet` is the row's 1-based position among those siblings.
33. `isExpanded` is false for every row without children, regardless of what the expanded
    set contains.
34. An id in the expanded set matching no node, or matching a node with no children, is
    ignored and changes nothing about the output.
35. Flattening never mutates the forest or the expanded set, and is pure and synchronous
    under the same constraints as the forest builder.
36. Flattening an empty forest returns an empty row list.
37. The row list is the single source of what renders, what the ARIA attributes say, and
    what the keyboard moves through. Nothing computes level, position or set size a second
    way.
38. Two rows never carry the same person id.
39. The row list is stable under re-flattening: expanding a node and collapsing it again
    reproduces the original row list exactly.
40. Nothing about the domain depends on the number of people. 33 is the current count, not
    an assumption anywhere.

### Reading the users payload

41. The page reads the users resource once per navigation to it, through the existing HTTP
    client and a repository.
42. **The envelope is tolerated in three shapes**, because Firebase's REST API chooses
    between them from the data rather than from a schema. Its documented heuristic is to
    render numeric-keyed data as an array while more than half the keys from 0 to the
    maximum are present, and as an object otherwise:
    - a JSON **array**, which is what the database returns today, and which **may contain
      `null` holes** at deleted indices;
    - a JSON **object** keyed by index or id, which is what it returns once the keys are
      sparse enough - the values are read in the object's own key order;
    - **`null`**, which is what it returns for an absent or emptied collection.
43. A `null` hole in an array is an **absent index**, not a malformed record: it is skipped
    silently, and it is never counted as a dropped row. Deleting one person from the live
    collection is an ordinary edit, and it must not produce drop telemetry that reads like a
    schema problem.
44. `null`, an empty array, an array of nothing but holes, and an empty object all mean the
    same thing: no users. They render the empty state. Emptying the shared database
    therefore reaches the empty state rather than an error, and that state is reachable from
    the real backend rather than only from a mock.
45. Any other payload shape - a string, a number, a boolean - is a parse failure and renders
    the error state.
46. Which of the three envelopes arrived never shows: the rendered tree, the counts and the
    row order are a function of the surviving records alone. Deleting a person changes the
    tree by exactly that person and by whatever their absence does to their reports, and by
    nothing else.
47. Each element is validated on its own. A person is kept when it has an `id` that is a
    safe positive integer, a string `firstName`, a string `lastName` and a string `email`.
    The id range matches what the expansion parameter can carry, so no person can be
    rendered whose branch could never be named in a shared link. `managerId` is optional and
    must be a safe positive integer when present; `photo` is optional and must be a string
    when present.
48. A row failing validation is dropped and counted; the rest still renders. One bad record
    never fails the page.
49. A payload of one or more elements where **every** element fails validation renders the
    error state, not the empty state: the empty state's copy asserts the database has no
    users, which would be a lie about a database that has users in a shape we no longer
    understand.
50. The `password` field, and every field not named above, is stripped at the boundary.
51. **What the password guarantee actually is**, stated so a test can check it and a proof
    can claim it honestly: the raw JSON response necessarily materializes inside the HTTP
    client before validation runs, so no invariant here claims a password never exists in
    process memory. What is guaranteed and asserted: no parsed person object carries a
    password field; no password value is rendered, logged, put in a telemetry record, put in
    a URL, or written to storage; and no fixture, mock or evidence file in this repository
    contains one.
52. Person ids and emails are branded, so a raw number or a raw string cannot be passed
    where a person id or an email is expected.
53. Validation failures are reported with the failing field names and the element's
    position, never with the field values - a malformed record can still contain a real
    person's email or password.
54. Whitespace around a name is trimmed for display. Neither name is re-cased; `"Justin "`
    renders as `Justin` and `uerra` renders as `uerra`.
55. A person whose two names are both empty after trimming still renders, with the email as
    the row's accessible name and the initials derived from the email's first character.
56. The email renders exactly as stored, with no trimming, casing or truncation of its
    value.
57. A **cancelled** request is not a failure. Where one occurs it reaches no render: whatever
    is on screen stays until something else commits, the page holds no "previous result" of
    its own to fall back to, and no error state, empty state or telemetry error event is
    produced. The outcome is modelled explicitly rather than folded into failure because the
    HTTP client can return it and a silent mapping to failure would render "Couldn't load the
    hierarchy" at a user who merely clicked twice. It is deliberately **not** claimed that a
    superseded navigation produces one: this route's loader returns without awaiting, so the
    router has already released the request by the time a newer navigation starts, and the
    abandoned request runs to completion. That is why the double-click case is described in
    terms of what does not render rather than what gets cancelled, and why the telemetry
    assertions expect the abandoned request's own events.

### The page: loading (mockup `1f`)

58. Navigating to `/` starts the users request at navigation time. The route renders while
    it is in flight; there is no render-then-fetch waterfall.
59. While the request is in flight the card renders its title and a loading indicator with
    the text "Loading hierarchy…", over skeleton rows shaped like tree rows at varying
    indents.
60. The skeleton is decorative: it exposes no rows, no tree role and no interactive element
    to assistive technology, and its placeholder shapes carry no text.
61. The loading state announces itself once as busy, and stops when data or an error
    arrives.
62. The header, the nav rail and the card frame are present and unchanged in every one of
    the four states; only the card's body changes.
63. The summary line is absent while loading - there are no counts yet - and the space it
    occupies is taken by the loading indicator.
64. Nothing in the loading state shifts layout when the data arrives beyond the rows
    replacing the skeleton. The assertion is concrete: the bounding boxes of the header, the
    nav rail and the card frame are captured before and after the data resolves and must be
    identical. It runs in a real browser, not in jsdom, where every rect is zero and the
    check would pass without measuring anything.
65. A response arriving faster than the skeleton can be seen still renders the data state
    correctly; there is no minimum display time and no flash-of-skeleton logic.

### The page: the request failed (mockup `1h`)

66. Any failure of the users request - network, timeout, non-2xx, an unparseable envelope,
    or every element failing validation - renders the error state inside the card, with the
    same header and nav rail as every other state.
67. The error state shows the alert glyph, the heading "Couldn't load the hierarchy", and a
    body explaining that the users request failed and that the session is still valid so
    retrying is safe.
68. Below the body sits a monospace chip carrying **the correlation id of the failed
    request** - not a backend error code. This is a deliberate deviation from mockup `1h`,
    which draws `permission-denied · users/read`; it is recorded in the decision log.
69. The correlation id in the chip is the same id on that request's log line and telemetry
    event, so a user can quote it and it can be found.
70. The error state offers two actions: **Retry**, which re-runs the loader and returns the
    page to the loading state, and **Back to login**, which navigates to `/login`.
71. Retry after a failure that then succeeds renders the data state with no document reload
    and no loss of the expansion carried in the URL.
72. Retry that fails again renders the error state again, with a **new** correlation id for
    the new request, so two failures are never indistinguishable. Repeated retries are
    permitted without limit and never disable the button.
73. "Back to login" does not sign the user out. It navigates; the session survives, and
    returning to `/` still works.
74. The error state is a rendered state, not a thrown error: it never reaches the route
    error boundary or the root error boundary.
75. No part of the failure is presented as blame on the user, and nothing tells the user to
    contact anyone in particular.
76. The error state exposes its heading as the page's live status, so a screen-reader user
    who was waiting on the skeleton learns that it failed.
77. Failing to load does not clear, rewrite or invalidate the `expanded` search parameter.

### The page: no users (mockup `1g`)

78. An empty collection in any of its three envelope shapes renders the empty state: an
    outline glyph, the heading "No users in the hierarchy yet", and a body explaining that
    the tree builds itself from the manager id on each record and that users will appear
    here once they exist.
79. The empty state offers exactly one action, **Refresh**, which re-runs the loader.
    Mockup `1g`'s second button, "View docs", is deliberately not built - there is no
    documentation site to point at. Recorded in the decision log.
80. The empty state renders no tree, no summary line and no rows, and exposes no `tree` role.

### The page: the tree (mockup `1e`)

81. The card header shows the title "All users" on one side and a summary line on the other
    reading the people count, the manager count and the root count.
82. **All three counts are computed from the forest**, after validation drops and after
    duplicate-id drops - so the people count always equals the number of rows the tree would
    show fully expanded. A payload of 33 records containing one duplicate id reads "32
    people", and never disagrees with what renders.
83. The counts describe the whole forest, not the visible rows. Collapsing a branch never
    changes them.
84. Exactly one row - the signed-in user's - carries a "you" marker beside the name and a
    highlighted row background. When the signed-in user's id matches no row, no row is
    marked and nothing else changes.
85. The signed-in identifier may be a string rather than a number, because phase 2's
    identifier type permits both. A string identifier matches no person id and therefore
    marks no row, which is the same no-match behavior and not an error.
86. The "you" marker is part of that row's accessible name, not a decorative badge a screen
    reader skips.
87. On first arrival with no expansion in the URL, every root and every root's direct
    children that have children of their own are expanded, and nothing deeper. The shape of
    the organization is legible without a click.
88. The default expansion is computed from the forest, not hardcoded: three roots or thirty,
    the rule is the same.
89. The tree renders every visible row from the row model in its order, and nothing else.
90. A row's indentation increases with its depth, and a vertical rail marks each nested
    group's extent, as drawn in mockup `1e`.
91. Toggling one branch re-renders only the rows whose row-model values actually changed,
    plus the rows entering or leaving the list. This is asserted with per-row render
    counters, not claimed: toggling a collapsed branch under one root must leave the render
    count of a row under a different root unchanged.
92. The nav rail on the left is decorative: it holds no link, no button and no focusable
    element, and it is hidden from assistive technology entirely. It is part of the drawn
    screens and `docs/reference.md` put it in scope; it renders in the authenticated shell,
    so it appears on every authenticated page rather than only on this one.

### A row

93. Each row shows, in order: the expand/collapse control slot, the badge, the name, the
    email, and - for managers - the report count on the far side.
94. Each row carries an explicit accessible name composed of the person's name (or their
    email, for the nameless case) plus the "you" marker where it applies. The name is
    explicit rather than computed from the row's contents, because a `treeitem` otherwise
    takes its name from everything inside it - the email, the report count and the toggle
    glyph included - which is neither what a screen reader should read nor what type-ahead
    should match.
95. The badge shows the person's photo when the record has one, and their initials when it
    does not.
96. Initials come from the existing kit derivation, which takes the first character of the
    **first word** and of the **last word** of the display name it is given, upper-cased. For
    the ordinary two-part name that is the first and last initial; for a multi-word first
    name it is the first and the final word, which is the kit's behaviour and is not
    re-implemented here. A single word yields one character, which is what the email-only
    case produces. Names outside the Latin alphabet take their own first characters, and no
    name is transliterated.
97. A photo that fails to load for any reason - 404, blocked as mixed content, blocked by
    the content security policy, offline - falls back to the initials badge. The fallback is
    silent to the user, and reported **once per person per load**: collapsing and re-opening
    the branch remounts the row and retries the image, and that must not produce a second
    report for the same person. The dedupe key is the person's id, held by the page rather
    than by a row, and the set of already-reported people **resets when a new payload
    resolves** - a retry that reloads the data reports a still-broken photo again, because
    that is a fresh observation rather than an echo of the old one.
98. At least one photo in the live database is served over `http://`, which the browser blocks
    on an `https://` page. The fallback is therefore a path the live data takes on first load,
    not a hypothetical. **How this one is proven is deliberately not automated**: the block
    only occurs on an https origin, the deployed suite does not sign in, and automating it
    would mean putting a real account's plaintext password into CI for a single assertion -
    against this phase's own rule that no credential material lives in this repository. It is
    verified once by hand against the deployed URL, with the screenshot of that row showing
    initials stored under `evidence/` and cited from PROOF.md. The automated suites prove the
    fallback itself by failing the image request; only the browser's reason for failing it is
    checked by hand.
99. Photo requests carry no referrer to the third-party host.
100. A photo has explicit dimensions before it loads, so an arriving image never shifts the
     row or the rows below it.
101. The photo is decorative in the accessibility tree: the row's accessible name already
     carries the person's name, so the image must not repeat it. This departs from
     `ARCHITECTURE.md`'s "avatars carrying meaningful alternatives" and is recorded in the
     decision log; the kit supports both and the choice is the page's.
102. The name renders as the trimmed first and last name interpolated into a catalogue
     string. It is **not** formatted through `Intl`: ECMA-402 has no person-name formatter,
     `Intl.ListFormat` would render "Justin and uerra", and a catalogue string with
     placeholders is the mechanism that actually lets a locale reorder the parts.
103. A manager's row shows its direct report count when expanded and the same number with
     hidden-wording when collapsed, as drawn in mockup `1e` ("3 reports" / "2 hidden"),
     pluralized through the catalogue. **"N hidden" counts direct reports**, not the whole
     hidden subtree, so the number a row shows never changes with expansion - only its
     wording does. A non-manager's row shows no count.
104. The name, the email and the count stay on one line, with the email truncating before
     the layout breaks, at 320px, 768px and 1280px and at the deepest indent the live data
     produces. Those three widths are the assertion; "every viewport" is not a claim any
     check could make.

### Expanding and collapsing

105. Only a manager's row has an expand/collapse control. A non-manager's row shows the
     inert "−" glyph in the same slot, as GOAL.md describes and mockup `1e` draws, and that
     glyph is not focusable, not clickable and hidden from assistive technology.
106. A manager's control shows "+" when the branch is collapsed and "−" when it is expanded.
107. The control is not a tab stop of its own. The tree is one tab stop and the control is
     reached through its row, never through Tab - otherwise the live data's 16 managers
     would make 17 tab stops. No automated accessibility check catches this, so it is
     asserted directly.
108. Clicking the control toggles that branch. Clicking anywhere else on the row does not
     toggle it, does not navigate and does not select anything - there is no selection
     concept on this page.
109. Collapsing a branch hides its entire subtree, at every depth, in one step.
110. Expanding a previously collapsed branch restores exactly the expansion its descendants
     had before it was collapsed - collapsing a parent does not silently collapse its
     children.
111. Toggling is immediate: no request, no spinner, no navigation round-trip before the rows
     change.
112. Toggling never re-fetches the users payload and never rebuilds the forest. Only the
     visible row list is recomputed. This is asserted by counting intercepted requests and
     by spying on the forest builder across a sequence of toggles.
113. Toggling a branch does not move the scroll position of the rows above it.
114. Every toggle - by mouse or by keyboard - announces the new state and the affected branch
     through a live region.
115. Every toggle emits one telemetry event carrying the new state and the row's depth. It
     carries no name, no email and no person id.

### Expansion in the URL

116. The set of expanded branches lives in the `expanded` search parameter, as the ids of
     the expanded manager rows.
117. Opening a URL carrying `expanded` renders exactly those branches open and every other
     branch closed, ignoring the default expansion.
118. **The parameter is parsed per segment, and is never "malformed" as a whole.** Absent
     means the default expansion; present means exactly what its valid segments name. A
     present-but-empty parameter therefore means every branch closed, which is a state the
     default expansion cannot otherwise express.
119. Segment parsing is total, so every input has a defined result: segments are split on
     commas; surrounding whitespace is trimmed; empty segments are skipped; a segment that
     is not a safe positive integer is skipped; a segment naming no person, or naming a
     person who is not a manager, is skipped; duplicates are honoured once. Nothing about a
     bad segment affects a good one, so `?expanded=abc,2217873750` opens exactly one branch.
120. When the URL carries more than one `expanded` parameter, the first is read and the rest
     ignored.
121. Skipped segments are counted and reported once per parse, so a link that has gone stale
     against a changed database is visible in telemetry rather than silently narrowed.
122. Every toggle updates the parameter and pushes a history entry, so Back undoes the last
     toggle and Forward redoes it.
123. Navigating Back past the first toggle returns to the entry URL and therefore to the
     default expansion.
124. A history entry that changes the expansion never re-fetches the users payload. The
     route declares that a change confined to the `expanded` parameter does not revalidate
     its loaders - without which react-router would re-run every loader on every toggle,
     because a changed search string revalidates by default.
125. Reloading the page re-renders the same expansion the URL describes, after the data
     loads again.
126. Copying the URL and opening it in another tab or another browser reproduces the same
     expansion, because nothing about the shape of the tree lives in storage.
127. The `expanded` parameter is the only search parameter this page owns. Any other
     parameter already on the URL - phase 2's `from`, for example - is preserved untouched
     across every toggle.
128. Nothing about expansion is written to `localStorage`, `sessionStorage`, a cookie or the
     session record.
129. The parameter contains person ids and nothing else. No email, no name, no session
     material ever enters the URL.

### Keyboard and accessibility

130. The tree is a single tab stop. Tab moves focus into the tree once, onto exactly one
     row, and the next Tab leaves the tree entirely.
131. On the first Tab into a freshly loaded tree, focus lands on the first visible row.
132. Exactly one row is tabbable at a time; the rest are reachable only through the tree's
     own keys. Returning to the tree with Tab restores focus to the row that last had it,
     and falls back to the first visible row when that row is no longer in the list.
133. Down and Up move focus to the next and previous **visible** row, crossing branch
     boundaries, and do nothing at the ends of the list.
134. Right on a collapsed manager expands it and leaves focus in place. Right on an expanded
     manager moves focus to its first child. Right on a non-manager does nothing.
135. Left on an expanded manager collapses it and leaves focus in place. Left on a collapsed
     manager, or on any non-manager, moves focus to its parent. Left on a root that is
     already collapsed does nothing.
136. Home moves focus to the first visible row, End to the last visible row.
137. Enter and Space both toggle the focused manager's branch, and do nothing on a
     non-manager's row.
138. Typing printable characters moves focus to the next visible row whose **accessible
     name** starts with what was typed, wrapping to the top. Matching is case-insensitive
     and accent-insensitive through a locale-aware comparison, and it matches the same
     string a screen reader announces - which for the nameless-person row is their email.
139. The type-ahead buffer resets after a second of no typing. A single repeated character
     cycles through the rows starting with it; two or more distinct characters match as a
     prefix.
140. `*` expands every sibling of the focused row **under the same parent** - not every row
     at the same depth elsewhere in the forest - leaving deeper levels as they were.
141. `*` is one action: one history entry, one live-region announcement naming how many
     branches opened, and one telemetry event. Eight branches opening does not mean eight
     Backs to undo one keystroke. A `*` that would open nothing - every sibling already
     open, or none with children - does nothing at all: no history entry, no announcement,
     no telemetry event. It is the only key that can be a no-op while still being a
     toggle-class action, because every other toggle necessarily changes the expanded set,
     so the case is settled here rather than left to an implementer.
142. The keyboard and the mouse share one implementation, so a toggle made with either
     updates the URL, the live region and telemetry identically. Moving focus is not a
     toggle: arrow keys, Home, End and type-ahead change focus only, and write nothing to
     the URL and nothing to telemetry.
143. Collapsing a branch that contains the focused row moves focus to the row being
     collapsed, so focus is never left on an element that is no longer rendered.
144. **When Back or Forward changes the expansion**, the focused row may disappear without
     any collapse having been performed. Focus then moves to the nearest still-visible
     ancestor of the row that vanished, or to the first visible row when there is none. The
     tree never ends a history navigation with focus on `document.body` and a roving
     tabindex that owns nothing.
145. The focused row shows a visible focus ring in both themes, meeting the contrast floor
     the project already holds itself to.
146. Each row exposes its level, its 1-based position among its siblings and the number of
     those siblings, taken from the row model.
147. Each manager's row exposes whether it is expanded. A non-manager's row exposes no
     expanded state at all, rather than exposing a false one.
148. The tree exposes an accessible name from the catalogue.
149. Expansion changes are announced politely, without stealing focus and without
     interrupting whatever is being read.
150. Motion respects `prefers-reduced-motion`: with it set, expansion and the loading
     indicator do not animate.
151. An automated accessibility scan finds no violation on any of the four states, both as
     rendered components and as real pages.
152. The keyboard contract is asserted key by key over the real rendered tree, with focus
     checked by accessible name - not described in prose and not asserted through
     implementation details.

### Internationalization

153. No user-visible string in this phase's code is a literal. Every one lives in the
     hierarchy catalogue.
154. All four states' text, the summary line, the report counts, the tree's accessible name,
     each row's accessible name and every live-region message come from the catalogue.
155. Counts pluralize through the catalogue's plural rules, not through an `=== 1` branch in
     a component.
156. Every number the user sees formats through `Intl` number formatting rather than string
     interpolation of a raw number.
157. The summary line composes through a single catalogue string with placeholders, never by
     joining fragments with a separator in code.
158. The layout uses logical properties throughout - indentation included - so a
     right-to-left locale needs a catalogue and a direction switch and nothing else.
159. The catalogue additions load with the route, not with the app entry.

### Telemetry

160. The users request is traced like every other request, with a correlation id appearing
     on the request log, on any error reported from this page, and in the error state's chip.
161. **One hierarchy-viewed event is emitted per completed users load**, carrying the people,
     manager and root counts and the number of rows dropped - not one per navigation, and
     not one per toggle. A toggle runs no loader, so the router short-circuits that
     navigation without ever entering its loading state; the interaction tracker only opens
     an interaction on a non-idle navigation, so a toggle mints no correlation id and emits
     no route-viewed event either. Toggling therefore adds exactly one event to the buffer:
     the toggle event. This is a consequence of suppressing revalidation for expansion-only
     changes, and the e2e assertion states the expected buffer contents exactly rather than
     counting loosely.
162. The hierarchy-viewed event carries no name, no email and no id.
163. Dropped rows are reported once per load with the count and the failing field names.
164. Dangling manager references, self-references, broken cycles and duplicate ids are each
     reported with a count, so a shape change in the shared database is visible rather than
     silently absorbed.
165. A failed load emits one error event with the failure kind and the correlation id. A
     cancelled request emits none. A **retry** adds exactly one hierarchy-viewed event, or
     one error event, and **no route-viewed event**: a revalidation never leaves the router's
     idle navigation state, so the interaction that mints the retry's correlation id is
     opened deliberately rather than by a navigation. The expected buffer contents after a
     retry are asserted, not inferred.
166. A photo that fails to load is reported without the photo URL, which is a third-party
     address tied to a named person.
167. No telemetry event, log line or error report from this page carries a password, an
     email, a person's name or a photo URL.
168. The events this phase adds are additions to the typed catalogue, not edits to existing
     event shapes. The mechanism is named in TECH.md and recorded in the decision log,
     because the platform's event map is closed today and the platform is not permitted to
     learn what a manager is.
169. The e2e suite asserts these events against the buffer sink, so the telemetry contract is
     tested rather than decorative.

### Security and privacy

170. The page makes one users request per navigation through the HTTP client and contacts no
     other origin through it.
171. Photo URLs are third-party addresses from a public database. They are loaded as images
     and nothing else: never fetched with credentials, never used as a link target, never
     echoed into telemetry.
172. The content security policy permits both secure and insecure third-party image origins -
     `img-src 'self' data: https: http:` - because today's `img-src 'self' data:` blocks
     every photo in the database. No other directive changes. `http://` image URLs are not
     CSP-blocked; the **browser's own mixed-content policy** is what blocks them on the
     deployed `https://` page, which is what invariant 98 actually exercises. See deviation
     10.
173. Nothing this phase adds writes to storage. The session record keeps the shape phase 2
     gave it.
174. The users payload is public and contains plaintext passwords. The password guarantee is
     the one stated in the parsing section - asserted on parsed objects, telemetry records,
     URLs, storage and repository fixtures, and not overclaimed about process memory.

### Performance

175. The tree route's code, its catalogue and its domain load only when the route is entered.
     The login route never pays for any of it, asserted against the built chunk graph.
176. The forest is built once per payload. Toggling recomputes the visible rows and nothing
     else.
177. Rendering 33 people is not treated as a scale problem: no virtualization, no windowing,
     no pagination ships. The row model is the seam a windowing layer would consume.
178. The route's chunk stays inside the existing per-route size budget, and the app entry
     budget is unchanged by this phase.

### Fidelity to the mockups

179. The four states match mockups `1e`, `1f`, `1g` and `1h` in structure, hierarchy,
     spacing rhythm and token usage: the same card, the same header treatment, the same row
     anatomy, the same nav rail.
180. Both themes are held to the project's contrast floor, including the row hover and
     selected backgrounds, the indent rail, the toggle border and the report-count text.
181. The mockups' sample people, counts and photos are illustrative. The live database's 33
     people, 16 managers and 3 roots are what actually renders.
182. Exactly two deliberate deviations from the mockups ship - the correlation-id chip and
     the single-button empty state - both recorded in the decision log. Any third one found
     during implementation is raised rather than absorbed.

### Documentation

183. `README.md` describes this project: what it does, how to run it, how to test it, how it
     is deployed, and where the specs live. No sentence of the Vite template survives.
184. `README.md` states the security gap plainly - a client-side lookup is not
     authentication and the database is public - rather than leaving a reader to infer it.
185. Every deviation this phase makes gets a decision-log entry in the same change, with what
     was chosen, why, and what was rejected. There are **ten**, and they are the ten
     enumerated in the deviations section below - **two** that depart from the mockups, which
     is the same two the mockup-fidelity invariant names, and eight that depart from
     `ARCHITECTURE.md` or from a phase-1 decision. The count is stated here, in that section
     and in the milestone that lands them, and the three must agree.
186. `ROADMAP.md`'s status board, phase 3 checkboxes and progress log are updated in the same
     change that closes the phase.

### What must not change

187. Phase 2's behavior is untouched: the derivation, the lookup, the session, the guard, the
     header, signing out and all five login states behave exactly as they did, asserted by
     running phase 2's own suite and e2e flows unchanged.
188. The route set stays `/`, `/login` and the not-found wildcard. This phase adds no route.
189. The HTTP client, the configuration module, the i18n runtime and the observability
     facade's three interfaces are consumed as they are.
190. **The changes this phase does make to shared surfaces are named here rather than
     discovered in review.** In the UI kit: `ErrorState` gains an optional second action and
     a glyph slot, `EmptyState` gains a glyph slot, both gain the ability to render unframed
     inside a caller's own card, and `Avatar` gains an image-failure callback. In the
     platform: the analytics event map becomes extensible by a feature. In the app's
     composition and routing: the runtime exposes its clock, which today it does not, because
     the type-ahead timer needs one and reaching for `setTimeout` is banned; the interaction
     tracker learns to ignore a revalidation-only state change, so a retry does not emit a
     spurious route-viewed event; the home route module grows from a bare re-export into the
     module that assembles the page's dependencies and its retry and refresh callbacks; and
     the lint policy gains a rule keeping the router's revalidation out of feature code. A new
     `shared/routing` module holds every route's absolute path, requested during
     implementation to stop the same `'/login'` from being redeclared independently in three
     places; `app/routing/routeDefinitions.ts` derives its route registration from it too. In
     phase 2's files: the authenticated loader returns the signed-in id, the authenticated
     layout renders the nav rail, and the guard pair (`requireSession.ts`,
     `resolveDestination.ts`) reads its login and home paths from `shared/routing` instead of
     its own local constants. Elsewhere: the content security policy's `img-src` widens, and
     the phase-1 vocabulary tripwires are retired. That is the whole list; anything beyond it
     is a design finding to raise, not a diff to slip in.
191. Every one of those additions is generic. No user, no session, no tree node and no
     hierarchy concept enters a kit component's signature or a platform type.
192. The layer boundaries hold. The hierarchy feature imports no other feature, imports
     nothing from `app`, exposes one public entry, and keeps its domain free of React.
193. Everything the feature needs from the outside arrives as an explicit dependency from the
     route that composes it, which is the pattern phase 2 established, and each arrives where
     it is actually used: the HTTP client reaches the feature's repository through the
     loader's argument, never through the page, because a page holding a client invites the
     render-then-fetch waterfall the loading invariant forbids; the observability facade, the
     clock behind the type-ahead timer, and the Retry and Refresh callbacks reach the page as
     props. No feature module reaches for a global, and no feature module calls the router's
     revalidation directly - doing so would bypass the interaction the new correlation id
     depends on, so the route owns that wrapping, the feature receives a plain callback, and
     a lint rule enforces it rather than leaving it to discipline.
194. No pipeline check is disabled, skipped or set to continue-on-error, and no coverage
     threshold is lowered, to make this phase green. The domain meets the 100% floor the
     pipeline already enforces for `features/*/domain`. Retiring the phase-1 tripwires is not
     an exception to this: they exist to stop phase 1 from anticipating phase 3, that
     purpose expires when phase 3 begins, and the retirement is a reviewed decision with its
     own entry rather than a quiet edit made to go green.
195. The browser console stays free of errors and warnings on every flow this phase adds,
     failure paths included, in development and in the production build alike.
196. Nothing here anticipates work beyond this phase: no search, no filter, no editing, no
     virtualization, no caching, and no abstraction whose only caller does not exist yet.

## Goals / Non-goals

**Goals**: the complete tree from the live database; four states; the full ARIA tree keyboard
contract, asserted; expansion that survives a refresh, a link and the back button; tolerance
of bad rows and of the backend's three envelope shapes; a README that describes this project.

**Non-goals**, each already a closed decision in `ARCHITECTURE.md` §7 or `ROADMAP.md`: search
and filtering; org editing; virtualization; response caching; selecting or navigating to a
person; a person detail view; sorting controls; showing the chart from a chosen person's
perspective; multi-select; drag-to-reparent; exporting.

## Deviations that need a decision-log entry

1. **The error chip carries the correlation id, not a backend error code.** Firebase REST
   does not return codes in mockup `1h`'s shape, so reproducing it literally would mean
   inventing failure codes. The correlation id is already on the request log and the
   telemetry event, which makes the chip actionable, and it matches phase 2's
   service-problem state.
2. **The empty state ships one button, not two.** There is no documentation site for "View
   docs" to point at.
3. **`img-src` widens to `https:`.** The live database's 12 photo URLs span nine third-party
   hosts, all blocked by today's policy, and `GOAL.md` requires the photo badge. Rejected: a
   nine-host allow-list, wrong the moment the shared database is edited and failing silently
   into initials; and dropping photos, which gives up a badge the brief asks for.
4. **Rows are flat `treeitem`s carrying explicit level, position and set-size, rather than
   nested `role=group` containers.** `ARCHITECTURE.md` §4 names `group`. The nested form
   would mean giving up the single flat row model that everything else derives from, or
   emitting `group` elements wrapping nothing meaningful. The ARIA specification permits the
   flat form precisely when the three attributes are explicit, which they are.
5. **The avatar image is decorative, against `ARCHITECTURE.md`'s "avatars carrying meaningful
   alternatives".** The row's accessible name already names the person; an `alt` repeating it
   makes a screen reader say the name twice. The kit supports both and the page chooses.
6. **The UI kit widens.** `ErrorState` gains a second action and a glyph, `EmptyState` gains
   a glyph, both gain an unframed mode, `Avatar` gains an image-failure callback. Rejected:
   composing duplicate error and empty surfaces inside the feature, which duplicates the kit
   and drifts; and cutting the spec to fit, which drops "Back to login", both glyphs and the
   photo telemetry.
7. **The platform's analytics event map becomes extensible by features.** Today it is a
   closed map in `platform`, and this phase's events carry people, manager and root counts -
   which `platform` may not learn, by its own layering rule and by the vocabulary guard.
8. **The phase-1 vocabulary tripwires are retired.** `assert-domain-vocabulary.mjs` bans the
   identifiers this phase's domain is built from and fails on `role="tree"`. They were built
   to stop phase 1 anticipating phase 3; that purpose expires here.
9. **A shared route-path module (`shared/routing`) replaces three independently-defined
   `LOGIN_PATH` constants and one bare `'/login'` literal.** `ARCHITECTURE.md` §"Boundaries
   and layers" says features own their route module end to end; this phase adds the one
   cross-feature exception, requested during implementation so a route rename touches one
   file rather than however many happened to redeclare it. It touches two of phase 2's files
   (`features/auth/guard/requireSession.ts`, `resolveDestination.ts`) beyond invariant 190's
   original list, with no behavior change - phase 2's own suite and e2e flows still pass
   unchanged, per invariant 187. Rejected: leaving the duplication, which is the actual
   problem being fixed; and a feature-owned map one side imports from the other, which is a
   cross-feature import invariant 192 already forbids.
10. **`img-src` widens to `https: http:`, not `https:` alone as this document originally
    specified.** A `https:`-only `img-src` blocks an `http://` photo URL by CSP on **every**
    origin, dev and deployed alike, which is not what invariant 98 describes: it says the
    block "only occurs on an https origin," meaning the same URL loads fine locally and fails
    only once deployed. That claim is true only if the browser's own mixed-content policy -
    not the content security policy - is what does the blocking, which requires `img-src` to
    permit `http:` sources in principle so CSP itself never intervenes first. Discovered
    while implementing the photo-fallback path locally: an `https:`-only policy made the
    fallback fire in dev too, which the spec's own "only occurs on an https origin" line
    said should not happen. Rejected: keeping `https:` only and rewriting invariant 98 to
    say the block happens everywhere, which is factually wrong (mixed-content protection is
    an https-page-only browser behavior, not a CSP one) and would misrepresent what the
    by-hand deployed check in step 43 actually proves.

## Decisions taken while specifying

Each was a real fork with a defensible alternative; each is the user's call.

1. **Sibling order is payload order.** The payload is a JSON array, so this is index order:
   stable and comparator-free. Rejected: alphabetical, which invents an ordering the brief
   does not describe; and by id, which is deterministic and meaningless.
2. **Every row failing validation is the error state, not the empty state.** The empty
   state's copy would assert an untrue thing about a database that is not empty. Rejected:
   treating "nothing survived parsing" as "nothing was there"; and an empty state carrying a
   warning, which invents a fifth state the mockups do not draw.
3. **Each toggle pushes a history entry**, so Back undoes the last toggle. Rejected:
   replacing the entry, which reduces the roadmap's "survives the back button" to "survives
   navigating away and returning".
4. **`*` stays in scope.** Claiming the full WAI-ARIA pattern while skipping one of its
   documented keys invites the review finding this phase exists to avoid.
5. **The envelope is tolerated in all three shapes Firebase produces.** Rejected: array-only,
   which makes the empty state unreachable from the real backend and puts the page one
   record deletion away from unusable - the opposite of the phase's own resilience outcome.
6. **"N hidden" counts direct reports.** The number a row shows never changes with
   expansion; only its wording does. Rejected: counting the whole hidden subtree, which is
   more informative but needs a subtree size on the row model and amendments to three
   invariants.
7. **The nav rail is built.** It is part of the drawn screens and `docs/reference.md` put it
   in scope. Rejected: dropping it as chrome `GOAL.md` never asks for.
8. **The kit widens rather than being duplicated or worked around** (see deviation 6).
