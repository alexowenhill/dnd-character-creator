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

Then it shows the finished character sheet.

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

`lib/shape.ts` normalises responses. The upstream API documents its request
bodies but not its response shapes, so rather than assuming one shape it probes
for the common envelope and field names, and falls back to showing raw JSON
instead of crashing.

## Known unknowns

This was built against the published documentation and Postman collection
without being able to call the live API, so some details are educated guesses:

- **Option lists.** If races, classes or backgrounds come up empty, the response
  shape is not one `lib/shape.ts` recognises. Check what the endpoint actually
  returns and add the field name to the key lists at the top of that file.
- **Class paths and background characteristics.** Assumed to arrive nested
  inside the class/background objects. If they are separate endpoints, those
  sub-steps will not appear.
- **`abilityRolls`.** The published example is not valid JSON (it uses braces
  where an array belongs). This sends an array.
- **Login encoding.** The Postman collection sends login and register as form
  data, so that is tried first, with a JSON retry if the server rejects it.

## Notes on the rules

- The API follows the 2014 5e ruleset.
- Ability scores are **rolled** — there is no point buy or standard array.
- Ability ids are alphabetical upstream (1 is charisma, 5 is strength), which is
  not sheet order. `ABILITIES` in `lib/shape.ts` holds the mapping.
- Character creation does not assign equipment, and derived numbers like HP and
  AC are not part of the flow.
