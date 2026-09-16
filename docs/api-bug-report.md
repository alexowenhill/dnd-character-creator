# Bug report: `POST /api/characters` rejects every request with `Bad Request`

A draft to send to the author of the D&D Yonder API (contact address is on the
docs page at https://dndapi.ashleysheridan.co.uk/). Fill in the bracketed bits
and paste the diagnosis output from the app's `/console` page underneath.

---

**Subject:** `POST /api/characters` returns `{"error":"Bad Request"}` for every request body

Hello,

I've been building a small character-creator front end against the API and have
hit a wall on character creation. Everything else works — registering, logging
in, `GET /api/user`, races, classes, backgrounds, languages, the name generator
and dice rolling all behave exactly as documented. Only creating a character
fails.

**What happens**

`POST /api/characters` responds `400` with `{"error":"Bad Request"}` regardless
of what I send. I tried, with a valid bearer token on every request:

| Request | Response |
| --- | --- |
| `{"name":"Test","level":1}` as JSON | `400 {"error":"Bad Request"}` |
| `name=Test&level=1` as form data | `400 {"error":"Bad Request"}` |
| `{"name":"Test"}` (no level) | `400 {"error":"Bad Request"}` |
| `{"name":"Test","level":"1"}` (level as string) | `400 {"error":"Bad Request"}` |
| a name with no spaces | `400 {"error":"Bad Request"}` |
| `{}` (empty body) | `400 {"error":"Bad Request"}` |
| `{"wibble":true}` (nonsense body) | `400 {"error":"Bad Request"}` |
| parameters in the query string instead | `400 {"error":"Bad Request"}` |

An empty body and a nonsense body producing exactly the same error as a
well-formed one suggests the handler is failing before it validates the input,
rather than objecting to a particular field.

`GET /api/characters` returns `[]` throughout, so nothing is being created.

**Things I ruled out**

- **The token.** `GET /api/user` returns my user record with the same token, and
  the reference endpoints all work with it.
- **POST in general.** `POST /api/game/dice` with the same token and a JSON body
  works and returns rolls, so the method, the token and the JSON handling are all
  fine elsewhere.
- **The route.** `POST /api/character` (singular) returns Laravel's normal
  `{"message":"The route api/character could not be found."}`, so the plural
  route exists and the `Bad Request` is coming from its own handler.
- **My client.** I verified the outgoing request against an echo server: it
  leaves as `POST /api/characters` with `Content-Type: application/json`,
  `Accept: application/json`, the `Authorization: Bearer …` header, and an
  intact 35-byte body.

**One documentation note, separately**

The docs give the create route as `POST /api/characters/` with a trailing slash,
but that URL answers `301` to `/api/characters`. That matters more than it might
seem: per the fetch spec a 301 answering a POST is retried as a **GET with the
body dropped**, so a browser client following the documented URL silently ends
up reading the characters list instead of creating anything — it looks like a
create that succeeded and returned `[]`. Might be worth either dropping the
slash from the docs or answering with a `307`/`308`, which preserve the method
and body.

Thanks for building and hosting this — the rest of it has been a pleasure to
work against.

[your name]

---

## Full transcript

[Paste the output of "Run diagnosis" → "Copy all as text" from the app's
`/console` page here. It contains every request and response verbatim.]
