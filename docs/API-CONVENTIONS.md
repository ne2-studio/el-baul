# API conventions

Routes, request bodies, response schemas and HTTP status codes are generated from the
backend controllers — that's the source of truth, not this file. Run the stack (see the
`run` skill / `api/README.md`) and open `http://localhost:5050/swagger` for Swagger UI, or
fetch `http://localhost:5050/swagger/v1/swagger.json` directly.

This file only covers the rules that don't show up in a generated schema: authorization,
error semantics, and product-level decisions about invitations, photos and display names.

## Authentication

All `/api/*` endpoints require a valid OIDC access token (`Authorization: Bearer <token>`)
unless explicitly marked `[AllowAnonymous]`.

Anonymous exceptions:

- `GET /api/persona-invites/{token}/preview` — public, rate-limited; used for a persona's
  directed invite link before the recipient has signed in.
- `GET /invitacion/baul/{token}` — public, rate-limited; invite landing HTML with Open Graph
  metadata for link previews.
- `GET /api/app-config` — public feature flags/URLs the frontend needs before login.
- `GET /email/click/{token}` — clicked from an email client, never carries auth.
- `GET /email/open/{token}.gif` — the open-tracking pixel loaded by the recipient's email
  client, never carries auth.
- `GET /email/assets/logo.png` — the masthead logo loaded by the recipient's email client,
  never carries auth. Served as a real URL (not embedded as a `data:` URI) because several
  major email clients/providers strip or refuse to render inline base64 images.
- `GET /push/opened/{token}` — called by the app itself when the user taps a push notification;
  push has no pixel to load, so unlike the email open tracker this is a plain client-side fetch,
  and it may fire with no active/valid session (app cold-started from the notification).
- `GET /s/{token}` — public shared photo/recuerdo landing with Open Graph metadata.
- `GET /api/tv-sessions/{token}` — public, rate-limited; Modo TV's temporary read-only session
  content (baúl name + every photo's date/chapter/tagged people/latest recuerdo). The token
  itself is the only credential — the TV never authenticates as a user.
- `POST /api/tv-pairings` — public, rate-limited; the TV's landing page creates a pairing
  before showing its QR code.
- `GET /api/tv-pairings/{code}` — public, rate-limited; the TV polls this while it waits for a
  phone to scan the QR code and claim it (`POST /api/tv-pairings/{code}/claim`, authenticated)
  into a real TV session.
- `GET /health` — liveness check.

## Errors

- `400 Bad Request` — invalid input, or an operation that can't be performed as requested.
- `401 Unauthorized` — missing or invalid authentication token.
- `403 Forbidden` — authenticated, but the caller has no access to this resource.
- `404 Not Found` — the resource doesn't exist, or its existence must not be disclosed to
  this caller (e.g. a baúl invite `preview` for an already-invalidated token).
- `503 Service Unavailable` — a downstream dependency required to complete the operation is
  unavailable, or the whole backend is in maintenance mode (`MaintenanceModeMiddleware`,
  see [`architecture/backend.md`](architecture/backend.md#controllers)) — every request gets
  this except `GET /api/app-config`.

All application error bodies share one shape, `{ "error": "..." }`. The mapping from an
application-layer failure to a status code is driven by `ApplicationError.Code`, not message text
(see [`architecture/backend.md`](architecture/backend.md#controllers) for the implementation).
Almost any authenticated endpoint can genuinely return any of 400/403/404/503 depending on what
failed, so the OpenAPI spec documents them uniformly rather than trying to guess which apply to a
given action.

## Authorization / roles

Baúl access roles: `custodio`, `administrador`, `colaborador`, `sin_acceso`. A custodio is
just the administrador marked as the baúl's original creator — identical permissions
otherwise. There is no read-only access role among the roles that grant access: every member
with access can add chapters/photos and post recuerdos. Only custodio/administrador can
manage Personas (invite, change role, revoke access), resolve removal requests, delete a
photo directly, or set the baúl's cover.

`sin_acceso` is a pre-selectable tier for a Persona who's part of the family's story but
should never be invited into the baúl — not a status a Persona can be left in only as a
byproduct of something else. It's only assignable to a Persona who hasn't joined yet
(`PersonaAccessStatus.Pending`); the role-update endpoint rejects setting it on a Persona who
already has an account linked (`Active`), and the invite endpoint rejects inviting a
`sin_acceso` Persona. "Revocar acceso" (`DELETE /api/baules/{baulId}/personas/{personaId}`)
clears the account link, invalidates that persona's invite token, and sets its role to
`sin_acceso` — the row falls back to Pending in exactly the state a fresh `sin_acceso`
Persona would be in, and can only be invited again after an admin picks a different role.

## Invitations

Invitations are directed, per-persona links, not a baúl-wide one. Each Persona owns at most
one invite token (`Persona.InviteToken`), issued lazily the first time an admin taps "Invitar"
(`POST /api/baules/{baulId}/personas/{personaId}/invite`, custodio/administrador-only, returns
a `PersonaInviteDto` with the shareable landing URL) and re-shared — never regenerated — on
every later tap while the persona stays Pending. The token has no expiry and cannot be
regenerated or cancelled directly; the only way it stops working is "Revocar acceso", which
clears it, or the persona already having been claimed.

Anyone who opens the link (`GET /api/persona-invites/{token}/preview`, public) can accept it
(`POST /api/persona-invites/{token}/accept`, authenticated, no body) to join the baúl as
exactly the persona the token was issued for — there is no "who are you" step, unlike the old
global invite link. If the caller already has an active Persona in that baúl — including
having already accepted this same token — accepting is a no-op. If the token instead resolves
to a persona already claimed by a different account, accepting is rejected the same way an
unknown token is (`404`), without disclosing that the persona exists.

## Photos

Photo URLs the API returns always go through imgproxy — never a direct object storage URL.
Deleting a photo (`DELETE /api/photos/{photoId}`) is a soft delete: the row is marked
`Deleted` with a reason and timestamp, excluded from every listing/preview endpoint from
then on, but the file itself is left in storage. A removal request is the non-custodian
path to the same outcome — anyone with access can raise one, a custodio/administrador
approves (which performs the same soft delete) or rejects it.

## Display names

Within a baúl, user-facing authorship — recuerdo `userName`, removal-request
`requesterName`, a chapter's `latestRecuerdoAuthor` — is always the author's Persona
nickname for that baúl, never the account-level OIDC-synced name. This is why the same
person can show up with a different display name in different baúles.

## Contract changes

There's no generated HTTP client between `api/` and `app`/`admin` yet. The backend DTOs and
controllers remain the source of truth; `app/src/api/generated/schema.ts` and
`admin/src/api/generated/schema.ts` are generated raw TypeScript contract types. The app's
HTTP facade stays at `app/src/api.ts`, with resource adapters under `app/src/api/resources/`
typing route templates, JSON bodies and responses from generated `paths` where practical.
`app/src/types/index.ts` and `admin/src/types.ts` keep the UI/domain adapter classes.

The reviewed OpenAPI contract snapshot lives at `api/openapi/v1.swagger.json` and is checked
by `ElBaul.Api.Tests`. Intentional contract changes must be reviewed and then accepted with:

```bash
./scripts/openapi accept-contract
```

The app/admin raw TypeScript contract types are generated from that snapshot. After accepting
an intentional OpenAPI change, regenerate them with:

```bash
./scripts/openapi generate-types
```

`schema.ts` runs several thousand lines and is never hand-edited — don't `Read` it in full.
Every hand-written call site (`api.ts`, `admin`'s equivalent) only plucks the specific DTO
types it needs by name (e.g. `components['schemas']['PhotoDto']`); grep for the DTO/type name
you need instead.
