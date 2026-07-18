# API Contract — El Baúl

Base URL: `VITE_API_URL` on the frontend (dev default `http://localhost:5050`).

All `/api/*` endpoints require a valid OIDC access token: `Authorization: Bearer <token>`,
except `GET /api/baules/{baulId}/preview` (public, rate-limited — used for invitation
links before the recipient has signed in). Unauthenticated requests to protected
endpoints get `401 Unauthorized`. Endpoints scoped to a baúl the caller has no access to
return `403 Forbidden`; missing resources return `404 Not Found`; validation failures
return `400 Bad Request`. All three shapes are `{ "error": "..." }`.

Roles within a baúl: `custodio` (owner, full control), `colaborador` (can add
albums/photos), `miembro` (read-only).

## Baúles

### `GET /api/baules`

List baúles the caller owns or has been shared, sorted by `updatedAt` descending (most
recently active first). Response `200 OK`: array of

```json
{
  "id": "uuid", "name": "string", "description": "string|null",
  "albumCount": 0, "coverPhotoUrl": "imgproxy-url|null",
  "createdAt": "iso", "updatedAt": "iso",
  "isCustodio": true, "role": "custodio|colaborador|miembro",
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

### `GET /api/baules/{baulId}/preview` (public)

Response `200 OK`: `{ "id", "name", "description", "previewPhotos": ["imgproxy-url", ...] }`
(up to 4 photos).

### `POST /api/baules/{baulId}/accept-invite`

Joins the caller as `miembro` if not already a member/custodian. Response `200 OK`:
`{ "success": true }`.

### `PUT /api/baules/{baulId}/cover`

Custodio only. Body: `{ "photoId" }` — must be a photo belonging to this baúl, otherwise
`404 Not Found`. Response `200 OK`: the updated baúl (same shape as above).

## Sharing

### `GET /api/baules/{baulId}/shared-users`

Custodio-scoped view of everyone with access (custodian included). Response `200 OK`:
array of `{ "id", "userId": "string|null", "email", "name": "string|null", "role", "status": "active|pending", "invitedDate": "iso", "baulId" }`.

### `POST /api/baules/{baulId}/share`

Custodio only. Body: `{ "email", "role": "colaborador|miembro" }`. If the email belongs
to an existing user, status is `active` immediately; otherwise `pending` until they sign
up and share the same email. Response `200 OK`: the `SharedUser`.

### `PUT /api/baules/{baulId}/shared-users/{sharedUserId}/role`

Custodio only. Body: `{ "role" }`. Response `200 OK`: the updated `SharedUser`.

### `DELETE /api/baules/{baulId}/shared-users/{email}`

Custodio only. Revokes access for that email. Response `200 OK`: `{ "success": true }`.

## Removal requests

Anyone with access can request a photo be removed; the custodian approves (deletes the
photo, decrements the album's photo count) or rejects (keeps it).

- `GET /api/baules/{baulId}/removal-requests` — custodio only.
- `POST /api/baules/{baulId}/removal-requests` — body `{ "photoId", "reason": "string|null" }`.
- `POST /api/baules/{baulId}/removal-requests/{requestId}/approve` — custodio only.
- `POST /api/baules/{baulId}/removal-requests/{requestId}/reject` — custodio only.

## Albums

### `GET /api/baules/{baulId}/albums`

Response `200 OK`: array of `{ "id", "baulId", "name", "description", "photoCount", "coverPhotoUrl": "imgproxy-url|null", "createdAt", "updatedAt" }`.

### `POST /api/baules/{baulId}/albums`

`colaborador` or `custodio` only. Body: `{ "name", "description": "string|null" }`.
Response `200 OK`: the album; increments the baúl's `albumCount`.

### `PUT /api/baules/{baulId}/albums/{albumId}/cover`

`colaborador` or `custodio` only. Body: `{ "photoId" }` — must be a photo belonging to
this album, otherwise `404 Not Found`. Response `200 OK`: the updated album (same shape
as above).

## Photos

### `GET /api/albums/{albumId}/photos`

Response `200 OK`: array of `{ "id", "albumId", "baulId", "thumbnailUrl": "imgproxy-url", "fullUrl": "imgproxy-url", "caption", "date", "uploadedBy", "createdAt" }`.
`thumbnailUrl` is sized for grid display, `fullUrl` for a full-screen viewer — both point
at imgproxy, never at storage directly.

### `POST /api/albums/{albumId}/photos`

`colaborador` or `custodio` only. `multipart/form-data`: `file` (required), `caption`
(optional), `date` (optional, ISO). Response `200 OK`: the photo; increments the album's
`photoCount`, and sets it as the album's cover if it's the first photo (and as the baúl's
cover if the baúl has none yet).

### `DELETE /api/photos/{photoId}`

`custodio` only — the only way to delete a photo directly (as opposed to a removal
request, which any member can raise for the custodio to approve/reject). Body:
`{ "reason": "string|null" }`. Soft delete: the photo is marked `Deleted` (with the
reason and a `deletedAt` timestamp) rather than removed from storage, and is excluded
from every listing/preview endpoint from then on. Decrements the album's `photoCount` if
the photo belonged to one. Response `200 OK`: `{ "success": true }`.

## Recuerdos (memories, attached to a photo or directly to an album)

Any member (not just `colaborador`/`custodio`) can read and create recuerdos.

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
