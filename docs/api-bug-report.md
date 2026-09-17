# Notes for the D&D Yonder API author

Findings from building a character creator against the API, with the source at
https://github.com/AshleyJSheridan/dnd-game-api. Contact address is on the docs
page at https://dndapi.ashleysheridan.co.uk/.

The first item is a documentation mismatch that makes character creation look
completely broken from the outside. The other two are small rules bugs.

---

**Subject:** Docs give the wrong field names for `POST /api/characters`, plus two rules bugs

Hello,

Thank you for publishing the source — it answered a problem I had spent a long
time on, and turned up two other things while I was in there.

## 1. `POST /api/characters` — documented field names do not match the code

The documentation gives the create body as:

```json
{"name": "Some heroic name", "level": 1}
```

`CharactersController::createCharacter` reads `charName` and `charLevel`:

```php
'name' => $jsonData->charName,
'level' => $jsonData->charLevel,
```

Anything else throws inside the `try`, and the `catch` returns
`{"error": "Bad Request"}` with a 400. Because that catch swallows every
exception into one generic message, the response is identical for a missing
field, a malformed body and an empty body — so from outside it looks like the
route is rejecting everything before it reads anything, rather than objecting to
a field name.

I tried eleven variations — both encodings, with and without `level`, an empty
body, a nonsense body, query parameters — and all returned exactly the same
error, which is what sent me looking at the source in the end.

Two suggestions, either of which would have saved the confusion:

- Update the docs to `charName` / `charLevel` (or accept `name` / `level` too).
- Include the exception message in the error response, at least in a non-production
  environment: `['error' => 'Bad Request', 'detail' => $e->getMessage()]`.

## 2. Hit points do not include the Constitution modifier

`CharacterResource::getHitPoints()`:

```php
$hitPoints = ($this->CharacterClass->hit_points_start ?? 0) +
    ($this->CharacterClass->hit_points_per_level ?? 0) * ($level - 1);
```

In 5e, a character adds their Constitution modifier at every level, so this
under-reports by `CON modifier × level`. A level 5 fighter with Constitution 16
should have 44 hit points and this returns 34.

## 3. Monk unarmoured defence reads Constitution instead of Wisdom

`CharacterResource::calculateArmorClass()`, in the Monk branch:

```php
$wis = $parsedAbilities->where('short_name', 'con')->first();
$response['modifiers']['wis'] = ($wis ? $wis->modifier : 0) + ...
```

The variable is named `$wis` but the lookup is `'con'` — the Barbarian branch
directly above uses `'con'` legitimately, so it looks like a copy-paste. Monk
unarmoured defence should be 10 + DEX + WIS.

## A smaller note

`PATCH /characters/{guid}` with `updateType: "race"` only applies when
`race_id === 0`, so a race cannot be changed once set. That may well be
deliberate, but it succeeds silently rather than saying so, which makes it look
like the update was applied.

Thanks again for building and hosting this — the name generator in particular is
lovely, and the breadth of what is in there now (campaigns, encounters,
inventory, lore) is impressive.

[your name]
