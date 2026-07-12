# API Contract — Tasks

Base URL: `VITE_API_URL` on the frontend (dev default `http://localhost:5050`).

All `/api/*` endpoints require a valid OIDC access token: `Authorization: Bearer <token>`.
Unauthenticated requests get `401 Unauthorized`.

## `POST /api/tasks`

Create a task.

Request body:

```json
{ "title": "Buy milk" }
```

Response `200 OK`:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "title": "Buy milk",
  "createdAt": "2026-07-07T12:00:00Z"
}
```

`400 Bad Request` — `{ "error": "..." }` on validation failure.

## `GET /api/tasks?skip=0&take=10`

List tasks, newest first. `skip` defaults to `0`, `take` defaults to `10` (max `100`).

Response `200 OK`: array of task objects (same shape as above).

`400 Bad Request` — `{ "error": "..." }` if `skip`/`take` are out of range.

## `DELETE /api/tasks/{id}`

Delete a task by id.

Response `204 No Content` on success.

`400 Bad Request` — `{ "error": "..." }` if `id` isn't a valid GUID.
`404 Not Found` — `{ "error": "..." }` if no task exists with that id.

## `GET /health`

Public, unauthenticated, rate-limited liveness check. Response `200 OK`: `{ "status": "healthy" }`.
