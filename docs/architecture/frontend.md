# Frontend architecture (`app/`)

React 19 + TypeScript + Vite consumer app. See [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for
where this fits in the wider system, [`native-android.md`](native-android.md) for the Capacitor
shell, [`../PRODUCT.md`](../PRODUCT.md) for product principles and domain language, and
[`../DESIGN.md`](../DESIGN.md) for the visual design system.

## Layers

```
features/<domain>/components/*Route.tsx  →  store/*  →  api.ts  →  types/index.ts
                    ↓ renders
        features/<domain>/components/*.tsx  (presentational screens/modals)
                    ↓ composed from
        design-system/{foundations,components,patterns,layouts}/*.tsx
```

- **`types/index.ts`** — one class per domain entity, so raw JSON can be re-hydrated via
  `new Entity(data)`.
- **`api.ts`** — a single `api` object, namespaced per resource. Plain `fetch` through a shared
  `handleResponse` that throws on non-OK responses; auth token is module-level state set via
  `setAccessToken()`. Every response is mapped back into its `types/index.ts` class.
- **`store/`** — not a single store; state is split by domain (Zustand, one store per area),
  plus a cross-cutting `uiStore.ts` for toast/modal state that isn't server data. Every mutating
  action calls `api.*` first and updates state from the response only after the await resolves.
  Sign-out resets every domain store from one place, not per-store.
- **`features/<domain>/components/*Route.tsx`** — one container component per route. A Route
  component reads `useParams`/store state, defines handlers (store actions, navigation, toasts),
  and renders a presentational component colocated in the same feature's `components/` folder,
  with everything passed as props — no business logic or store access in the presentational
  component itself.
- **`design-system/`** — everything with zero knowledge of El Baúl's domain types. See
  [`docs/adr/0002-design-system-taxonomy.md`](../adr/0002-design-system-taxonomy.md) for the
  full Foundations/Components/Patterns/Layouts/Features/Screens taxonomy and the litmus test for
  what belongs here versus in a feature.
- **`App.tsx`** — owns routing (`react-router-dom`, no shared `<Layout>` wrapper — each route
  renders its own screen), the auth redirect gate, and one-time domain data load on auth change.
  Every protected route is wrapped in `<ProtectedRoute>`/`<PublicRoute>`, not a layout component.
- **`main.tsx`** — entry point: Sentry `ErrorBoundary`, `<AuthProvider>` (OIDC config), and
  `<BrowserRouter>`. Registers the PWA service worker and, on native platforms, wires Capacitor
  deep-link callbacks into the OIDC redirect flow (see [`native-android.md`](native-android.md)).

## Conventions

- **Auth**: `react-oidc-context`. There's no mock/demo login — the app always redirects to the
  configured OIDC provider's `/authorize` endpoint and only becomes authenticated once that flow
  completes. `App.tsx` redirects to sign-in whenever the user isn't authenticated and isn't on a
  public path; the access token is pushed into `api.ts` on every auth state change.
- **Routing**: all routes declared flat in `App.tsx`, in Spanish
  (`/baules/:baulId/capitulos/:chapterId/foto/:photoId`) — the domain language is the URL
  language too. This is frontend-only: the backend's own API routes are English, so the two
  surfaces don't share a vocabulary.
- **State management**: Zustand only, split by concern as above — no React Context for domain
  data, no server-state library (React Query, SWR).
- **Styling**: Tailwind CSS v4, CSS-first config (no `tailwind.config.js`). Colors/typography are
  theme tokens sourced from [`../DESIGN.md`](../DESIGN.md) — never raw hex/Tailwind palette
  classes in components.
- **Product semantics**: [`../PRODUCT.md`](../PRODUCT.md) defines the mission, current product
  priorities and glossary that should guide copy, empty states, AI affordances and domain naming.
- **Error monitoring**: `@sentry/react` (+ `@sentry/capacitor` on native). `npm run build` never
  talks to Sentry itself — it only stamps deterministic debug ids into `dist/`; uploading
  sourcemaps is a separate script that only CI runs, against the `dist/` extracted from the
  already-built Docker image.
- **TypeScript**: `@/*` path alias maps to `app/src`.
- **Runtime config**: env vars are read via `src/runtimeConfig.ts`'s `getEnv()`, which prefers a
  runtime override (`window.__ENV__`, injected into the built image from container env vars at
  container start) and falls back to the Vite build-time value when no override is set. This
  lets the *same built image* be pointed at a different backend without rebuilding, while
  `npm run dev`/Storybook/the Capacitor build keep working off the build-time value alone.
  `admin/` has no equivalent mechanism — its image is config-baked at build time only.
- **No shared package/types** between frontend and backend — DTO shapes are kept in sync by
  hand. See [`../API-CONVENTIONS.md`](../API-CONVENTIONS.md#contract-changes).

## Structure

```text
src/
├── api.ts         # Single fetch client for the backend (namespaced per resource)
├── types/         # Domain entity classes, hydrated from api.ts responses
├── app/           # Base components, routes and main layout
├── features/      # Modules per domain (auth, baules, chapters, photos, sharing, profile, …)
├── store/         # Zustand: one store per domain + uiStore (toasts/modals)
├── design-system/ # Domain-independent UI — see ADR 0002
├── native/         # Capacitor integrations — see native-android.md
└── utils/         # Utility functions/helpers
```

See [`testing.md`](testing.md) for what test level to reach for.
