# Admin backoffice architecture (`admin/`)

React 19 + TypeScript + Vite internal operations backoffice, structurally similar to `app/`
(same `api.ts`/`store/`/`features/` layering — see [`frontend.md`](frontend.md)) but a separate,
independently deployable service with no shared code.

- **Auth**: `react-oidc-context` against the same OIDC provider as `app/`, via a separate OIDC
  client (`el-baul-admin` locally). Requires the authenticated user to carry the `admin` role —
  see [`../operations/local-development.md`](../operations/local-development.md) for the local
  fake-oidc test user that has it.
- **Config**: unlike `app/`, the built image has no runtime-config injection mechanism — its
  config is baked in at Vite build time only (see [`infrastructure.md`](infrastructure.md#containers)).
- **Features**: `baules`, `dashboard`, `emails`, `users` — operator-facing views over the same
  domain model `app/` exposes to end users, plus admin-only actions (e.g. hard-deleting a baúl).

See [`../PRODUCT.md`](../PRODUCT.md) for product principles and domain language,
[`../DESIGN.md`](../DESIGN.md) for the shared visual design system, and [`testing.md`](testing.md)
for what test level to reach for.
