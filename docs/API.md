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

List baúles the caller owns or has been shared. Response `200 OK`: array of

```json
{
  "id": "uuid", "name": "string", "description": "string|null",
  "albumCount": 0, "coverPhotoUrl": "imgproxy-url|null",
  "createdAt": "iso", "updatedAt": "iso",
  "isCustodio": true, "role": "custodio|colaborador|miembro"
}
```

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

## Recuerdos (comments on a photo)

- `GET /api/photos/{photoId}/recuerdos` — response `200 OK`: array of `{ "id", "photoId", "userId", "text", "userName", "createdAt", "isOwn" }`.
- `POST /api/photos/{photoId}/recuerdos` — body `{ "text" }`. Response `200 OK`: the recuerdo.

## Users

### `GET /api/users/me`

Response `200 OK`: `{ "id", "email", "name": "string|null", "createdAt" }` — the caller's
profile, JIT-synced from OIDC claims on each authenticated request.

## Health

### `GET /health`

Public, unauthenticated, rate-limited liveness check. Response `200 OK`: `{ "status": "healthy" }`.
