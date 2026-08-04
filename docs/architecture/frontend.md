# Frontend architecture (`app/`)

React 19 + TypeScript + Vite consumer app. See [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for
where this fits in the wider system, [`native-android.md`](native-android.md) for the Capacitor
shell, [`../PRODUCT.md`](../PRODUCT.md) for product principles and domain language, and
[`../DESIGN.md`](../DESIGN.md) for the visual design system.

## Layers

```
features/<domain>/components/*Route.tsx  →  features/<domain>/useCases/*  →  store/*  →  api.ts  →  types/index.ts
                    ↓ renders                          ↑ orchestrates
        features/<domain>/components/*.tsx      (store actions, api.*, other stores/use cases)
        (presentational screens/modals)
                    ↓ composed from
        design-system/{foundations,components,patterns,layouts}/*.tsx
```

- **`types/index.ts`** — one class per domain entity, so raw JSON can be re-hydrated via
  `new Entity(data)`.
- **`api.ts`** — a single `api` object, namespaced per resource. Plain `fetch` through a shared
  `handleResponse` that throws on non-OK responses; auth token is module-level state set via
  `setAccessToken()`. Every response is mapped back into its `types/index.ts` class.
- **`store/`** — not a single store; state is split by domain (Zustand, one store per area),
  plus a cross-cutting `uiStore.ts` for toast/modal state that isn't server data. Stores hold
  state, `reset()`, and (for stores not yet migrated — see below) their own actions. Sign-out
  resets every domain store from one place, not per-store.
- **`features/<domain>/useCases/index.ts`** — a use case is a plain async function that
  orchestrates one action end to end: it calls `api.*`, writes the result into a store via
  `useXStore.setState()`, and may call other stores/use cases when an action has cross-domain
  side effects (e.g. deleting a chapter also clearing its recuerdos cache). One module per
  feature, not one file per use case — `features/<domain>/useCases/index.ts`, split into
  multiple files under that folder only once it grows large enough to earn it (mirrors
  `features/photos/uploadFlow/` and `features/photos/viewerNavigation/`, the existing precedent
  for this shape). This layer is being introduced incrementally, store by store; a store with no
  `useCases/` module yet still owns its actions directly, called straight from its Route.
  - **Ownership when a store is consumed by several features** (most domain stores are — e.g.
    `useBaulesStore` backs `baules`, `chapters`, `photos` and `sharing` routes): a use case lives
    in the feature that is its only caller. When several features call it with the exact same
    signature and behavior (no per-caller variation), it lives in the feature that owns that
    entity's presentational components instead (e.g. `editRecuerdo` is called from `baules`,
    `chapters` and `photos` alike, so it lives in `features/memories/useCases`, which already
    owns `Recuerdo*` components) — the other callers import across the feature boundary, same as
    they already cross it to reach the shared store today. When different features need a
    genuinely different shape of the same store's data, split them into separate use cases, each
    in its own feature (e.g. `usePersonasStore`'s photo-tagging actions live in
    `features/photos/useCases`, not `features/people/useCases`, since only photo routes call
    them).
- **`features/<domain>/components/*Route.tsx`** — one container component per route. A Route
  component reads `useParams`/store state directly (reactive subscription — this does not go
  through `useCases/`), defines handlers that call `useCases/` functions for anything mutating
  (navigation and toasts stay in the Route), and renders a presentational component colocated in
  the same feature's `components/` folder, with everything passed as props — no business logic
  or store access in the presentational component itself.
  - **Exception**: a Route may call `api.*` directly, bypassing `store/`/`useCases/`, when the
    result is never cached or shared across routes — there's no state a store would own. This
    covers: blob downloads (`api.photos.download`), one-off share-link creation consumed
    immediately by the share sheet, on-demand pagination handed to a child as a fetch callback
    (cover/avatar pickers), secrets that must always be re-fetched fresh rather than cached
    (invite link regeneration), fire-and-forget submissions with no resulting state
    (`api.support.submit`), and pre-auth bootstrapping flows that run before domain stores are
    populated (accepting a baúl invite). If a second call site needs the same data, or the data
    must survive navigation, move it to a store instead of adding a second direct caller.
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
│                  #   <domain>/components/ — Route + presentational components
│                  #   <domain>/useCases/   — orchestration layer, being introduced incrementally
├── store/         # Zustand: one store per domain + uiStore (toasts/modals)
├── design-system/ # Domain-independent UI — see ADR 0002
├── native/         # Capacitor integrations — see native-android.md
└── utils/         # Utility functions/helpers
```

See [`testing.md`](testing.md) for what test level to reach for.
