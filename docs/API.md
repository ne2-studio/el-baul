# API Contract — El Baúl

Base URL: `VITE_API_URL` on the frontend (dev default `http://localhost:5050`).

All `/api/*` endpoints require a valid OIDC access token: `Authorization: Bearer <token>`,
except `GET /api/shared-users/{sharedUserId}/invite-preview` (public, rate-limited — used
for personal invitation links before the recipient has signed in). Unauthenticated
requests to protected endpoints get `401 Unauthorized`. Endpoints scoped to a baúl the
caller has no access to return `403 Forbidden`; missing resources return
`404 Not Found`; validation failures return `400 Bad Request`. All three shapes are
`{ "error": "..." }`.

Roles within a baúl: `custodio` (created the baúl, full control), `administrador` (same
permissions as custodio — a custodio is just an administrador marked as the baúl's
original creator), `colaborador` (can add albums/photos, but not manage people or the
baúl itself). There is no read-only role — everyone with access can add chapters/photos.

## Baúles

### `GET /api/baules`

List baúles the caller owns or has been shared, sorted by `updatedAt` descending (most
recently active first). Response `200 OK`: array of

```json
{
  "id": "uuid", "name": "string", "description": "string|null",
  "albumCount": 0, "coverPhotoUrl": "imgproxy-url|null",
  "createdAt": "iso", "updatedAt": "iso",
  "isCustodio": true, "role": "custodio|administrador|colaborador",
  "memberCount": 1
}
```

`memberCount` is the total number of people with access, custodio included (so it's
never less than 1) — not just invited/shared users.

### `POST /api/baules`

Body: `{ "name": "string", "description": "string|null" }`. Response `200 OK`: the baúl
(same shape as above), caller becomes custodio.

### `GET /api/baules/{baulId}`

Response `200 OK`: the baúl. `403` if the caller has no access.

### `PUT /api/baules/{baulId}/cover`

Custodio/administrador only. Body: `{ "photoId" }` — must be a photo belonging to this
baúl, otherwise `404 Not Found`. Response `200 OK`: the updated baúl (same shape as
above).

## Personas & invitations

Growth is strictly person-to-person: the custodio/administrador adds a "Persona" for
each family member up front — with just a nickname, no account required — and shares
that Persona's own invitation link (e.g. over WhatsApp). There is no public "join this
baúl" link and no self-serve join flow; a `SharedUser` row (a Persona) always exists
before its invitation is ever sent, and starts with `userId: null`.

### `GET /api/baules/{baulId}/shared-users`

Everyone with access can view the baúl's Personas (custodian included). Response
`200 OK`: array of
`{ "id", "userId": "string|null", "email": "string|null", "name": "string|null", "nickname", "role", "status": "active|pending", "invitedDate": "iso", "baulId" }`.
`email`/`name` are the linked `User`'s (`null` while `userId` is `null`); `status` is
just derived from whether `userId` is set — `"pending"` means no one has claimed the
invitation yet, `"active"` means they have.

### `POST /api/baules/{baulId}/personas`

Custodio/administrador only. Body: `{ "nickname" }`. Creates a Persona with no linked
user (`role` always starts as `colaborador`) — the response's `id` doubles as the
invitation token: the invite link is `/invitacion/persona/{id}` on the frontend.
Response `200 OK`: the `SharedUser`.

### `GET /api/shared-users/{sharedUserId}/invite-preview` (public)

Response `200 OK`: `{ "id", "name", "description", "personaNickname", "previewPhotos": ["imgproxy-url", ...] }`
(up to 4 photos) — the baúl's preview plus the Persona's nickname, so the invite screen
can greet the recipient by name before they sign in. `404 Not Found` if the invitation
doesn't exist or has already been claimed (`userId` already set).

### `POST /api/shared-users/{sharedUserId}/accept-invite`

Links the caller's account to that Persona (`userId` = caller) if it's still
unclaimed. Idempotent if the caller already claimed it; `400 Bad Request` if someone
else did. Response `200 OK`: the `SharedUser` (its `baulId` is what the frontend
redirects to next).

### `PUT /api/baules/{baulId}/shared-users/{sharedUserId}/role`

Custodio/administrador only. Body: `{ "role": "colaborador|administrador" }`. Response
`200 OK`: the updated `SharedUser`.

### `DELETE /api/baules/{baulId}/shared-users/{sharedUserId}`

Custodio/administrador only. Removes that Persona (revokes access if already claimed,
cancels the invitation otherwise). Response `200 OK`: `{ "success": true }`.

## Removal requests

Anyone with access can request a photo be removed; a custodio/administrador approves
(deletes the photo, decrements the album's photo count) or rejects (keeps it).

- `GET /api/baules/{baulId}/removal-requests` — custodio/administrador only.
- `POST /api/baules/{baulId}/removal-requests` — body `{ "photoId", "reason": "string|null" }`.
- `POST /api/baules/{baulId}/removal-requests/{requestId}/approve` — custodio/administrador only.
- `POST /api/baules/{baulId}/removal-requests/{requestId}/reject` — custodio/administrador only.

## Albums

### `GET /api/baules/{baulId}/albums`

Response `200 OK`: array of `{ "id", "baulId", "name", "description", "photoCount", "coverPhotoUrl": "imgproxy-url|null", "createdAt", "updatedAt" }`.

### `POST /api/baules/{baulId}/albums`

Any member with access (no read-only role exists). Body: `{ "name", "description": "string|null" }`.
Response `200 OK`: the album; increments the baúl's `albumCount`.

### `PUT /api/baules/{baulId}/albums/{albumId}/cover`

Any member with access. Body: `{ "photoId" }` — must be a photo belonging to
this album, otherwise `404 Not Found`. Response `200 OK`: the updated album (same shape
as above).

## Photos

### `GET /api/albums/{albumId}/photos`

Response `200 OK`: array of `{ "id", "albumId", "baulId", "thumbnailUrl": "imgproxy-url", "fullUrl": "imgproxy-url", "caption", "date", "uploadedBy", "createdAt" }`.
`thumbnailUrl` is sized for grid display, `fullUrl` for a full-screen viewer — both point
at imgproxy, never at storage directly.

### `POST /api/albums/{albumId}/photos`

Any member with access. `multipart/form-data`: `file` (required), `caption`
(optional), `date` (optional, ISO). Response `200 OK`: the photo; increments the album's
`photoCount`, and sets it as the album's cover if it's the first photo (and as the baúl's
cover if the baúl has none yet).

### `DELETE /api/photos/{photoId}`

Custodio/administrador only — the only way to delete a photo directly (as opposed to a
removal request, which any member can raise for a custodio/administrador to
approve/reject). Body: `{ "reason": "string|null" }`. Soft delete: the photo is marked
`Deleted` (with the reason and a `deletedAt` timestamp) rather than removed from
storage, and is excluded from every listing/preview endpoint from then on. Decrements
the album's `photoCount` if the photo belonged to one. Response `200 OK`:
`{ "success": true }`.

## Recuerdos (memories, attached to a photo or directly to an album)

Any member with access can read and create recuerdos. `userName` (here and in
`removal-requests`' `requesterName`, and `albums`' `latestRecuerdoAuthor`) is always the
author's Persona nickname (`SharedUsers.Nickname` for that baúl), never the underlying
account's OIDC-synced name — falls back to `"Usuario"` if the author has no
`SharedUsers` row in this baúl (shouldn't normally happen, since that's what access is
gated on).

- `GET /api/photos/{photoId}/recuerdos` — response `200 OK`: array of `{ "id", "photoId", "userId", "text", "userName", "createdAt", "isOwn" }`.
- `POST /api/photos/{photoId}/recuerdos` — body `{ "text" }`. Response `200 OK`: the recuerdo.
  Always ends up with a `photoId`; `albumId` is set internally from the photo's album (null for
  a loose photo) but not returned by this endpoint.
- `GET /api/baules/{baulId}/albums/{albumId}/recuerdos` — the album's Recuerdos feed, newest
  first. Includes recuerdos created directly on the album (no photo) and ones created via one of
  its photos. Response `200 OK`: array of `{ "id", "photoId": "string|null", "userId", "text",
  "userName", "createdAt", "isOwn", "photoThumbnailUrl": "imgproxy-url|null" }` — `photoId`/
  `photoThumbnailUrl` are only present when the recuerdo has an associated photo.
- `POST /api/baules/{baulId}/albums/{albumId}/recuerdos` — body `{ "text" }`. Creates a recuerdo
  directly on the album with no photo (`photoId: null` in the response). Response `200 OK`: the
  recuerdo.

## Users

### `GET /api/users/me`

Response `200 OK`: `{ "id", "email", "name": "string|null", "createdAt" }` — the caller's
profile, JIT-synced from OIDC claims on each authenticated request.

## Health

### `GET /health`

Public, unauthenticated, rate-limited liveness check. Response `200 OK`: `{ "status": "healthy" }`.
