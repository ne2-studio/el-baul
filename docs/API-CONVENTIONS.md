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

- `GET /api/baul-invites/{token}/preview` — public, rate-limited; used for the global baúl
  invite link before the recipient has signed in.
- `GET /api/app-config` — public feature flags/URLs the frontend needs before login.
- `GET /email/click/{token}` — clicked from an email client, never carries auth.
- `GET /s/{token}` — public shared photo/recuerdo landing with Open Graph metadata.
- `GET /health` — liveness check.

## Errors

- `400 Bad Request` — invalid input, or an operation that can't be performed as requested.
- `401 Unauthorized` — missing or invalid authentication token.
- `403 Forbidden` — authenticated, but the caller has no access to this resource.
- `404 Not Found` — the resource doesn't exist, or its existence must not be disclosed to
  this caller (e.g. a baúl invite `preview` for an already-invalidated token).
- `503 Service Unavailable` — a downstream dependency required to complete the operation is
  unavailable.

All application error bodies share one shape, `{ "error": "..." }`. The mapping from an
application-layer failure to a status code is driven by `ApplicationError.Code`, not message text
(see [`architecture/backend.md`](architecture/backend.md#controllers) for the implementation).
Almost any authenticated endpoint can genuinely return any of 400/403/404/503 depending on what
failed, so the OpenAPI spec documents them uniformly rather than trying to guess which apply to a
given action.

## Authorization / roles

Baúl access roles: `custodio`, `administrador`, `colaborador`. A custodio is just the
administrador marked as the baúl's original creator — identical permissions otherwise.
There is no read-only access role: every member with access can add chapters/photos and post
recuerdos. Only custodio/administrador can manage Personas (invite, change role, revoke
access), resolve removal requests, delete a photo directly, or set the baúl's cover.

Personas can also have the internal role `sin_acceso`: they still belong to the baúl's family
history and can remain tagged in photos/recuerdos, but they do not count as members with access
and cannot accept or preview invitation links.

## Invitations

The only way to grow a baúl's membership is the **global invite link**: one reusable,
regenerable link per baúl (`GET /api/baules/{baulId}/invite-link`,
`POST /api/baules/{baulId}/invite-link/regenerate`, both custodio/administrador-only), with no
expiry and no usage limit. Anyone who opens it (`GET /api/baul-invites/{token}/preview`,
public) can accept it (`POST /api/baul-invites/{token}/accept`, optional `personaId` in the
body) to join the baúl.

Before accepting, the client can list the baúl's still-unclaimed Personas
(`GET /api/baul-invites/{token}/claimable-personas`, authenticated) — Pending ones only, i.e.
`IsClaimable` (never `sin_acceso`, never already linked to an account) — so the joining
account can say "I'm this pre-provisioned family member" instead of always getting a new
Persona. Passing a `personaId` links the account to that existing (claimable) row —
same-name backfill as any other claim, existing avatar/biografia untouched; passing none
auto-creates a new Persona — nickname/name from the account, avatar best-effort from the
account's OIDC `picture` claim (never blocks the join if it's missing or the fetch fails).

If the caller already has an active Persona in that baúl — including the custodio opening
their own link — accepting is a no-op regardless of `personaId`. If their existing Persona
there is `sin_acceso`, accepting is rejected — only an admin can restore revoked access, never
a self-serve link. Regenerating the link immediately invalidates the previous one (`404` on
its old token) — there is only ever one active link per baúl at a time.

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
