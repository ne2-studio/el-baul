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

- `GET /api/personas/{personaId}/invite-preview` — public, rate-limited; used for personal
  invitation links before the recipient has signed in.
- `GET /api/app-config` — public feature flags/URLs the frontend needs before login.
- `GET /email/click/{token}` — clicked from an email client, never carries auth.
- `GET /health` — liveness check.

## Errors

- `400 Bad Request` — invalid input, or an operation that can't be performed as requested.
- `401 Unauthorized` — missing or invalid authentication token.
- `403 Forbidden` — authenticated, but the caller has no access to this resource.
- `404 Not Found` — the resource doesn't exist, or its existence must not be disclosed to
  this caller (e.g. `invite-preview` for an already-claimed invitation).

All three error bodies share one shape, `{ "error": "..." }`, produced by
`ElBaul.Api.ErrorMapping.ToActionResult` from the Application layer's `Result.Error`
string: it checks the message for `"access denied"` → 403, `"not found"` → 404, and
defaults to 400 otherwise. Because that mapping is shared and message-driven, almost any
authenticated endpoint can genuinely return any of 400/403/404 depending on what failed —
the OpenAPI spec documents all three uniformly rather than trying to guess which apply to
a given action.

## Authorization / roles

Baúl roles: `custodio`, `administrador`, `colaborador`. A custodio is just the
administrador marked as the baúl's original creator — identical permissions otherwise.
There is no read-only role: every member with access can add chapters/photos and post
recuerdos. Only custodio/administrador can manage Personas (invite, change role, remove),
resolve removal requests, delete a photo directly, or set the baúl's cover.

## Invitations

Growth is strictly person-to-person, never a generic join link. The custodio/administrador
creates a Persona for each family member up front — nickname only, no account required —
and shares that Persona's own invitation link (e.g. over WhatsApp). A Persona row always
exists, with `userId: null`, before its invitation is ever sent; accepting an invitation
(`POST /api/personas/{personaId}/accept-invite`) just links the caller's account to that
existing Persona. There is no self-serve "join this baúl" flow.

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

## Keeping the frontend in sync

There's no shared package or generated client between `api/` and `app/`/`admin/` yet —
`app/src/types/index.ts` and `admin/src/types.ts` are hand-maintained TypeScript mirrors of
`api/ElBaul/Ports/Input/*Dto.cs`. When a DTO or route changes, update the backend first,
then check the generated OpenAPI spec (not this file, and not memory) for the new shape
before updating the frontend types by hand.
