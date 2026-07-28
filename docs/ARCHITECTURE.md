# El Baúl architecture

This document is the entry point to the architecture documentation. It contains system-wide
constraints and routes readers to the detailed documentation for each subsystem. It
intentionally does not document individual classes, endpoints, or operational commands — those
live in the subsystem docs below, or are cheap to discover by reading the code.

Follow the patterns described across these documents when extending the app; if you deviate,
leave a comment explaining why.

## System overview

El Baúl is composed of independently deployable services, with no shared runtime code between
them:

- `api/` — ASP.NET Core backend
- `app/` — React consumer application
- `app/android/` — Capacitor Android shell for `app/`
- `admin/` — React operations backoffice
- `imgproxy/` — image transformation service
- `e2e-tests/` — whole-system Playwright smoke tests

El Baúl is a private, shared photo archive: a **baúl** (trunk) is a family archive owned by a
**custodio** (custodian), containing **chapters** (capítulos), each holding **photos**. A baúl is
shared with other people as **personas** — a per-baúl identity (nickname + role: `custodio`,
`administrador`, or `colaborador`) distinct from the underlying account. Non-custodian members
can request a photo's removal (`RemovalRequest`); the custodian or an administrador approves or
rejects it — photos are never hard-deleted by anyone else.

## System-wide rules

- Each deployable service owns its implementation and dependencies — no shared package or
  generated client between `api/` and `app/`/`admin/`.
- The backend (`api/`) is the source of truth for business rules.
- OpenAPI generated from the backend (`/swagger` in Development) is the source of truth for API
  routes and schemas — see [`API-CONVENTIONS.md`](API-CONVENTIONS.md) for the semantics that
  don't show up in a schema.
- Authentication is OIDC/JWT Bearer end-to-end (Zitadel in practice); the backend is stateless —
  every request is authenticated independently, there is no session state.
- Object-storage URLs are never exposed directly to clients — see
  [`architecture/infrastructure.md`](architecture/infrastructure.md).
- Architectural exceptions or deviations from these docs should leave a comment explaining why;
  significant decisions get an ADR (see [`adr/`](adr/)).

## Documentation map

Read only the documents relevant to the change:

| Change | Read |
|---|---|
| Backend domain, use cases, persistence, project boundaries | [`architecture/backend.md`](architecture/backend.md) |
| Consumer frontend (`app/`) | [`architecture/frontend.md`](architecture/frontend.md) |
| Admin backoffice (`admin/`) | [`architecture/admin.md`](architecture/admin.md) |
| Capacitor or native Android | [`architecture/native-android.md`](architecture/native-android.md) |
| Test selection or test structure | [`architecture/testing.md`](architecture/testing.md) |
| MinIO, imgproxy, container build shape | [`architecture/infrastructure.md`](architecture/infrastructure.md) |
| GitHub Actions / CI/CD | [`architecture/deployment.md`](architecture/deployment.md) |
| API authorization, error and product semantics | [`API-CONVENTIONS.md`](API-CONVENTIONS.md) |
| Product mission, priorities, principles and glossary | [`PRODUCT.md`](PRODUCT.md) |
| Visual design system, tokens | [`DESIGN.md`](DESIGN.md) |
| Running the stack locally | [`operations/local-development.md`](operations/local-development.md) |
| `el-baul-api-lite` (in-memory backend for frontend tests) | [`operations/api-lite.md`](operations/api-lite.md) |
| Backend maintenance commands | [`operations/maintenance-commands.md`](operations/maintenance-commands.md) |

## Decision precedence

1. ADRs (`adr/`) override general architecture within their stated scope.
2. This documentation defines intended conventions.
3. Existing code is evidence of implementation, not automatically the standard — code and docs
   drift; when they disagree, treat it as a bug in one of them, not a tiebreaker.
