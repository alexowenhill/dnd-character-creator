# Character creator

A guided D&D 5e character builder for one group of friends. Everyone shares a
single password, answers a few questions about how they like to play, rolls
their stats, and comes away with a finished level 5 sheet. The party page shows
everyone's characters in one place.

No rules knowledge needed, and nothing to install.

## How it works for a player

1. Open the site, type the party password. No username, no account.
2. Answer seven questions — how you handle trouble, where you came from, why
   you are out here. They are about temperament, not rules.
3. The suggestions come back ranked, with the reasons. Take them or ignore them:
   every race, class, background and alignment is still there to pick from.
4. Roll your abilities — six sets of 4d6 keeping the best three. The app
   arranges them sensibly for the class you chose; drag them around if you'd
   rather.
5. Pick your skills, and your spells if you cast.
6. Name them, and you are done. The sheet has everything you need to play.

## What the sheet works out

- Ability scores, with racial bonuses and the level 4 improvement, capped at 20
- Hit points, hit dice, armour class, initiative, speed
- Proficiency bonus, all six saving throws, all eighteen skills
- Passive perception
- For casters: spell save DC, spell attack bonus, spell slots per level, how
  many cantrips and spells to prepare or know
- Class features and racial traits at your level
- The actual dice that produced each ability score

Everything is recomputed from the stored choices each time it is shown, so a
rules correction applies to characters that already exist.

## Running it locally

```bash
npm install
cp .env.example .env.local   # set PARTY_PASSWORD at minimum
npm run dev
```

Then open http://localhost:3000.

Locally, characters are stored in `.data/characters.json`. On Netlify they go
into Netlify Blobs, which needs no configuration.

## Deploying to Netlify

Connect the repository and set the environment variables from `.env.example`.
`netlify.toml` covers the rest — build command, publish directory, and the
Next.js runtime for the server-side parts.

`PARTY_PASSWORD` is the only one that is required.

## Tests

```bash
npm test
```

Covers the rules maths against worked examples — hit points for several
class and constitution combinations, unarmoured AC for monks and barbarians,
saving throws, skill proficiencies from both background and class, spell slots
for full, half and pact casters, ability caps — plus the quiz scoring and the
session cookie signing, including that a tampered cookie is rejected.

## About the D&D Yonder API

This started as a front end for the
[D&D Yonder API](https://dndapi.ashleysheridan.co.uk/). Its character storage
turned out to be broken: `POST /api/characters` rejects every request with
`{"error":"Bad Request"}`, including an empty body, so nothing can be saved
there. `docs/api-bug-report.md` has the full investigation, ready to send.

So the rules live in `lib/srd.ts` and characters are stored by this app. The API
is still used where it is good and where a failure costs nothing:

- **Dice.** Ability rolls go through `POST /api/game/dice`, which stores each
  roll server-side against a guid — harder to quietly re-roll than something
  done in the browser. Falls back to the platform CSPRNG.
- **Names.** The Markov-chain name generator, per race.
- **Spells.** The spell index, filtered by class and level.

All three degrade to something sensible if the API is slow, down, or
unconfigured. Leave `YONDER_EMAIL` and `YONDER_PASSWORD` unset and the app works
fine without it.

One D&D Yonder account serves the whole site. Players never see it and never
sign in to it — the credentials stay in environment variables and the token
stays on the server.

## Notes on the rules

- 2014 ruleset. Races, classes, backgrounds and subclasses are the SRD set.
- Hit points use the fixed average per level rather than rolling, which is what
  most tables do and avoids a level 5 character with 14 hit points.
- Armour class assumes a sensible kit for the class, named on the sheet. Change
  your armour and the number changes — the sheet shows the formula.
- Each class has its SRD subclass. If your DM allows others, pick the closest
  and note the real one.
- Ability scores are rolled, 4d6 drop lowest. There is no point buy.
- Equipment, feats and multiclassing are not covered.
