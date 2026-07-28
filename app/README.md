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
localhost. The app is then available at the stable Vite URL `http://localhost:5173`;
if that port is occupied, `npm run dev` fails instead of moving to another port. You'll need
the backend (and, for a full login flow, fake-oidc) running too, see the root [`README.md`](../README.md) or
[`docs/operations/local-development.md`](../docs/operations/local-development.md).

```bash
npm run typecheck
npm run build
```

### Storybook

Component/design-system catalog, built from this same `app/` tree.

```bash
npm run storybook         # dev server at http://localhost:6006
npm run build-storybook   # static site, output to storybook-static/
npm run test:storybook    # executable Storybook specs in Chromium
```

Also available via the root Docker Compose stack (`storybook` service) at
`http://localhost:6006`, built from [`../storybook/Dockerfile`](../storybook/Dockerfile) — its
build context is the repo root since it needs this whole directory.

### Android (Capacitor)

`app/` also ships as a native Android app — see
[`docs/architecture/native-android.md`](../docs/architecture/native-android.md) for how
Capacitor is wired in.

```bash
npm run android:build       # vite build --mode android (.env.android) + cap sync android
cd android && ./gradlew assembleDebug
```

Produces an unsigned debug APK. Open `app/android` in Android Studio instead of the Gradle CLI
if you need an emulator/device run rather than just a build artifact.

## Verify

```bash
../scripts/verify frontend        # TypeScript + Vitest unit/component + Storybook specs
../scripts/verify frontend-acceptance  # Playwright — el-baul-api-lite behavioral coverage
```

`frontend` is the required source-level gate before building the frontend image. It runs ordinary
Vitest tests first, then Storybook's executable specs through the separate `storybook` Vitest
project in Chromium. `frontend-acceptance` stays after image build and validates the packaged app
against `el-baul-api-lite`; it builds both Docker images with fresh verification tags before
running.

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
- Product guide: [`docs/PRODUCT.md`](../docs/PRODUCT.md)
- Design system: [`docs/DESIGN.md`](../docs/DESIGN.md)
- Testing strategy: [`docs/architecture/testing.md`](../docs/architecture/testing.md)
