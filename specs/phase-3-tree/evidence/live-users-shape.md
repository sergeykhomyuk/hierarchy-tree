# Live `users` payload - confirmed shape

Captured 2026-08-15 from `GET https://gongfetest.firebaseio.com/users.json`, pasted into
the loop by the user (the sandbox blocked every direct fetch from this session). This file
closes `docs/reference.md`'s open item - "the exact field names on a `users` record are
unconfirmed" - and is the schema TECH.md writes its Zod parser against.

**Password values are deliberately absent.** The field exists on every record and is
redacted here; `scripts/assert-no-secrets.mjs` guards the repository against carrying it,
and the Zod schema drops it at the boundary so it never becomes a value in application
memory.

## Envelope

- The response is a **JSON array**, not an object keyed by id. `users[1].firstName` from
  `docs/task.md` is an array index, not a record key.
- 33 elements, no `null` holes.

## Fields

- `id` - number, 10 digits, unique across the payload. Present on all 33.
- `firstName` - string. Present on all 33.
- `lastName` - string. Present on all 33.
- `email` - string. Present on all 33.
- `password` - string. Present on all 33. Redacted here, dropped at the boundary.
- `managerId` - number. Present on 30, **absent** (not null) on the 3 roots.
- `photo` - string URL. Present on 12, **absent** on the other 21.

No record carries a field outside that set, and no record is missing a field another has
except the two optional ones above.

## Shape of the live forest

- 33 people, 16 distinct managers, **3 roots** - `2217873750` (Anthony Xiouping),
  `4260010878` (Catherine Ngo), `2170754312` (Gunter Bhara).
- Every `managerId` resolves to a record in the same payload: no dangling manager, and no
  cycle. The tolerant paths in the domain are therefore exercised by fixtures, not by the
  live data - which is exactly why they need fixtures.
- Deepest chain is 6 levels: Catherine Ngo > Annie Vuuren > Mark Morando > Arcadio Mao >
  Gnana Salvador > Angus Ravishankar.
- The summary line over live data reads `33 people - 16 managers - 3 roots`.

## Data quirks that the spec has to answer for

1. **A mixed-content photo.** Morten Eizik's `photo` is an `http://` URL. The site is
   served over https, so the browser blocks that request outright and the avatar must fall
   back to initials - an error path the live data hits on first load, not a hypothetical.
2. **Whitespace in a name.** Record `4353773161` has `firstName` `"Justin "` with a
   trailing space, and `lastName` `"uerra"` in lower case. Display formatting has to be
   deliberate rather than assumed clean.
3. **Third-party image hosts.** The 12 photo URLs span 9 hosts (gstatic, cloudfront,
   maybelline.com, australian-bodycare.com, ...). CSP `img-src` and the referrer policy
   have to accommodate arbitrary https hosts, and any one of them can 404.
4. **Duplicate surnames** (two `Ngo`) and repeated first names (two `Ryan`, two `Justin`).
   Nothing may key off a name.
5. **Ids are numbers, not strings.** Branding them keeps a raw number from being passed
   where a user id is expected, and JSON numbers this large stay exact as doubles.

## Sibling order

The user's Frame decision is **payload order**: siblings render in the order the array
yields them. With an array envelope this is index order, which is stable and needs no
comparator - unlike the object envelope the reference document assumed, where key order
would have been an implementation detail of the JSON parser.
