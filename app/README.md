# El Baúl — Frontend

React 19 + TypeScript + Vite consumer application for web, PWA and Android through Capacitor,
talking to [`../api`](../api) via `src/api.ts`.

## Run

### Prerequisites

- [Node.js](https://nodejs.org/) 22+

### Steps

```bash
npm install
cp .env.example .env
npm run dev
```

`.env` needs `VITE_API_URL` (the backend's base URL), `VITE_OIDC_AUTHORITY`,
`VITE_OIDC_CLIENT_ID`, `VITE_OIDC_CALLBACK_URI`, and `VITE_ZITADEL_ORGANIZATION_ID`. The
committed defaults point at the backend/fake-oidc from the root `docker-compose.yaml` running on
localhost. The app is then available at `http://localhost:5173` — you'll need the backend (and,
for a full login flow, fake-oidc) running too, see the root [`README.md`](../README.md) or
[`docs/operations/local-development.md`](../docs/operations/local-development.md).

```bash
npm run typecheck
npm run build
```

## Verify

```bash
npm test            # Vitest — unit tests (store logic, utils)
npm run test:e2e    # Playwright — el-baul-api-lite, behavioral regression coverage
```

`npm run test:e2e` needs both images built first:

```bash
docker build -t el-baul-app:local .
docker build -f ../api/ElBaul.Api.Lite/Dockerfile -t el-baul-api-lite:local ../api
APP_IMAGE=el-baul-app:local API_LITE_IMAGE=el-baul-api-lite:local npm run test:e2e
```

See [`docs/architecture/testing.md`](../docs/architecture/testing.md) for what each test level
covers and when to reach for the root-level [`/e2e-tests`](../e2e-tests) suite instead.

## Structure

```text
src/
├── api.ts         # Single fetch client for the backend (namespaced per resource)
├── types/         # Domain entity classes, hydrated from api.ts responses
├── app/           # Base components, routes and main layout
├── features/      # Modules per domain (auth, baules, chapters, photos, sharing, profile, …)
├── store/         # Zustand: one store per domain + uiStore (toasts/modals)
├── design-system/ # Domain-independent UI
├── native/        # Capacitor integrations
└── utils/         # Utility functions/helpers
```

## Further documentation

- Frontend architecture: [`docs/architecture/frontend.md`](../docs/architecture/frontend.md)
- Native Android: [`docs/architecture/native-android.md`](../docs/architecture/native-android.md)
- Design system: [`docs/DESIGN.md`](../docs/DESIGN.md)
- Testing strategy: [`docs/architecture/testing.md`](../docs/architecture/testing.md)
