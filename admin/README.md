# El Baúl — Admin backoffice

React 19 + TypeScript + Vite internal operations backoffice for El Baúl, talking to
[`../api`](../api) via `src/api.ts`.

## Run

```bash
npm install
npm run dev
```

Runs at `http://localhost:3001`. Requires the backend and fake-oidc running — see
[`docs/operations/local-development.md`](../docs/operations/local-development.md). Sign in with
the `admin` fake-oidc test user; other users get `AccessDenied`.

```bash
npm run lint
npm run build
```

## Verify

```bash
../scripts/verify admin
```

## Structure

```text
src/
├── api.ts     # Single fetch client for the backend (namespaced per resource)
├── types.ts   # Domain entity types, hydrated from api.ts responses
├── app/       # Base components and main layout
├── routes/    # Route definitions
├── features/  # Modules per domain (baules, dashboard, emails, users)
├── store/     # Zustand
└── utils/     # Utility functions/helpers
```

## Further documentation

- Admin architecture: [`docs/architecture/admin.md`](../docs/architecture/admin.md)
- Frontend architecture (shared layering pattern): [`docs/architecture/frontend.md`](../docs/architecture/frontend.md)
- Design system: [`docs/DESIGN.md`](../docs/DESIGN.md)
