# Character creator

A friendly web UI for rolling up D&D 5e characters, so a group of friends can
make characters without wrestling with a character sheet.

It is a thin front end over the [D&D Yonder API](https://dndapi.ashleysheridan.co.uk/),
a free public API by Ashley Sheridan that does the actual character creation and
stores the characters.

## What it does

One page, walked through in steps:

1. **Name** — type one, or get suggestions from the API's name generator (pick a
   style: elf, dwarf, tiefling, and so on).
2. **Race**
3. **Class**, plus a class path if the class has one.
4. **Background**, plus its characteristics.
5. **Abilities** — rolls 4d6 six times, then you decide which roll goes to which
   ability.
6. **Languages**
7. **Spells** — only the ones this character can actually cast.

Then it shows the finished character sheet: race, class and path, background,
the six ability scores with their modifiers, languages, spells and
characteristics. The raw API response is one click away underneath.

You can step back at any point; each step is saved independently, so going back
and re-saving just overwrites that part.

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Everyone needs an account on D&D Yonder, since that is where characters are
stored. The app has a register option built into the first screen; any email
address works, it is only used to log in.

## Deploying to Netlify

Connect the repo to Netlify and it should pick everything up from
`netlify.toml` — build command `npm run build`, publish directory `.next`, and
Netlify's Next.js runtime for the server-side parts.

No environment variables are required. If you ever need to point at a different
backend, set `DND_API_BASE`; it defaults to `https://dndapi.ashleysheridan.co.uk`.

## How it talks to the API

Every D&D Yonder endpoint needs a bearer token. The token is kept in an
httpOnly cookie and attached server-side, so it never reaches the browser:

- `app/api/dnd/auth` — logs in or registers, and sets the cookie.
- `app/api/dnd/[...path]` — a catch-all proxy. `/api/dnd/characters/races`
  becomes `{DND_API_BASE}/api/characters/races` with the token attached.

That also means endpoints this UI does not cover yet — encounters, creatures,
the undocumented campaign map routes — already work through the same path if you
want to build on them.

The proxy takes the upstream path from the request URL rather than from Next's
parsed route params, because a trailing slash matters upstream: the documented
create route is `POST /api/characters/`, and Next would otherwise 308 the slash
away before the proxy saw it. Hence `skipTrailingSlashRedirect` in
`next.config.ts`.

## Response shapes

The upstream API documents its request bodies but not its responses, so
`lib/shape.ts` (option lists, dice rolls) and `lib/sheet.ts` (the finished
character) probe for the common envelope and field names rather than assuming
one. Anything they cannot find is left out of the sheet instead of crashing, and
the raw JSON stays visible underneath.

### Checking them against the live API

**The response readers have not been run against the real service.** This was
built in an environment whose egress policy blocks
`dndapi.ashleysheridan.co.uk`, so the shapes above are informed guesses.

From a machine that can reach the API, this walks a character all the way
through and reports what actually comes back:

```bash
npm run probe
```

It registers a throwaway account, creates a character, applies race, class and
background, rolls and assigns all six abilities, then fetches the finished
sheet — checking each of the app's readers against the real response and naming
the file to fix when one is wrong. Reuse an existing account with
`DND_EMAIL=… DND_PASSWORD=… npm run probe`. The full transcript lands in
`probe-output.json`.

It also resolves two things the docs do not pin down: whether login wants form
or JSON encoding, and which path serves the language list (it tries
`/api/game/languages`, `/api/characters/languages` and `/api/languages`).

### What has been verified

- `npm test` covers the response readers against a range of plausible payload
  shapes — enveloped and bare, abilities keyed by id, by name and by short code,
  and unrecognised junk — including the alphabetical ability ids, where a silent
  mix-up would hand someone the wrong stats.
- The whole flow has been walked end to end in a browser against a local mock of
  the API: register, create, race, class and path, background and
  characteristics, six dice rolls and assignment, languages, spells, and the
  rendered sheet — plus that the token is never readable from JavaScript.

Both of those prove the app's own wiring. Neither proves the guessed field
names, which is what `npm run probe` is for.

### If signing in fails

The sign-in screen shows what the API actually replied, under "What the API
actually sent back" — start there rather than guessing.

`extractToken` in `lib/shape.ts` searches for the token under the names Laravel
apps commonly use (`token`, `access_token`, Sanctum's `plainTextToken`,
Passport's `access_token`), at the top level or inside a `data`/`user`
envelope, so a merely unexpected nesting is handled. If the detail panel shows a
token under some other name again, add it to `TOKEN_KEYS`.

"Signed in, but no token came back" means the call returned 2xx with no token
anywhere in it. Most often that is the API reporting a problem in a 200 — wrong
password, or an account that does not exist yet — and the message after the
colon is the API's own words.

### If a step comes up empty

That means the response used field names the readers do not know.

- Option lists (races, classes, backgrounds, languages, spells) — add the key to
  the lists at the top of `lib/shape.ts`.
- The finished sheet — add it to the corresponding list in `lib/sheet.ts`.
- Class paths and background characteristics are assumed to arrive nested inside
  the class/background objects. If they turn out to be separate endpoints, those
  sub-steps will not appear and need their own fetch.

## Notes on the rules

- The API follows the 2014 5e ruleset.
- Ability scores are **rolled** — there is no point buy or standard array.
- Ability ids are alphabetical upstream (1 is charisma, 5 is strength), which is
  not sheet order. `ABILITIES` in `lib/shape.ts` holds the mapping.
- The score shown next to each roll is the usual best three of four. The server
  keeps the raw roll and applies its own rule, so the saved score is whatever it
  decides — the sheet at the end shows the authoritative values.
- Character creation does not assign equipment, and derived numbers like HP and
  AC are not part of the flow.
