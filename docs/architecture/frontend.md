# Frontend architecture (`app/`)

React 19 + TypeScript + Vite consumer app. See [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for
where this fits in the wider system, [`native-android.md`](native-android.md) for the Capacitor
shell, [`../PRODUCT.md`](../PRODUCT.md) for product principles and domain language, and
[`../DESIGN.md`](../DESIGN.md) for the visual design system.

## Layers

```
features/<domain>/routes/*Route.tsx  →  features/<domain>/useCases/*  →  store/*  →  api.ts  →  types/index.ts
                    ↓ renders                    ↑ orchestrates
        features/<domain>/components/*.tsx  (store actions, api.*, other stores/use cases)
        (presentational screens/modals — zero router/store/useCases imports)
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
  for this shape). Every domain store's actions have been extracted this way; a store now holds
  only state, `reset()`, and (rarely) a cross-store setter with no `api.*` call of its own, like
  `useBaulesStore.removePhotoFromCaches`. `uiStore` and `useAppConfigStore` are the deliberate
  exceptions — cross-cutting state with no real orchestration to extract, same category as the
  auth-session slice of `useAuthStore` (`isAuthenticated`, `userProfile`, `subscription`).
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
- **`features/<domain>/routes/*Route.tsx`** — one container component per route, one module per
  feature (peer of `useCases/`, `components/`, `native/`). A Route component reads
  `useParams`/store state directly (reactive subscription — this does not go through
  `useCases/`), defines handlers that call `useCases/` functions for anything mutating
  (navigation and toasts stay in the Route), and renders a presentational component from the
  same feature's `components/` folder, with everything passed as props. `components/` is
  strictly presentational: no `react-router-dom`, `store/`, or `useCases/` imports there — those
  belong in `routes/`. Enforced by ESLint (`eslint.config.js`'s `componentBoundaryRule`,
  scoped to `features/*/components/**`), not just convention — a presentational component that
  needs to trigger a toast, navigate, or read a store takes a prop callback from its Route
  instead (see `InviteFamilyModal`'s `onToast` prop for the pattern). `memories` has no
  `routes/` at all: every one of its components is consumed by another feature's Route (e.g.
  `RecuerdoInput` renders inside `baules`/`chapters`/`photos` routes), so it's a pure
  component+useCase library with no URL of its own.
  - **Domain boundaries get revisited, not just individual files.** `sharing` originally also
    owned `PersonaDetailRoute` (viewing/editing one persona, including `ManageAccessModal` and
    `RevokeAccessModal`) and `RemovalRequestsRoute` (reviewing pending photo-removal requests) —
    neither is about *crossing the app's boundary* (inviting someone in, sharing a photo out),
    which is what `sharing` is actually for. Both moved to the feature that owns the entity being
    acted on: the persona-detail cluster to `people` (already a family member, being viewed or
    managed — not being invited), the removal-request review queue to `photos` (next to
    `submitRemovalRequest`, reuniting the whole submit → review → resolve lifecycle in one
    feature). The tell was cross-feature imports with no entity-ownership justification: `sharing`
    reaching into `people/components` for four single-use modals, `photos/components` for a list
    only `sharing` ever rendered. When a feature's file list stops fitting a one-sentence
    description, check whether a piece of it actually belongs to a different feature before
    assuming the description just needs to get vaguer.
  - **The same principle applies one level down, to a tab or panel instead of a whole URL.**
    `BaulRoute`/`ChapterRoute` used to assemble every tab's orchestration inline — persona
    creation, recuerdo create/edit/share, photo multi-select batch actions — which meant they
    imported use cases from unrelated features just to wire one screen. Each such tab/panel
    now lives in a `features/<domain>/containers/*.tsx` component, owned by the feature whose
    entity it's about (`BaulPersonasTabContainer`, `PersonaBiografiaTabContainer`,
    `PersonaFotosTabContainer` in `people`, `BaulRecuerdosTabContainer`/
    `ChapterRecuerdosFeedContainer` in `memories`, `BatchPhotoActionsContainer` in `photos`) —
    same-domain tabs get split too, not just cross-feature ones, whenever a tab's own state
    (e.g. `PersonaFotosTabContainer`'s photo-loading effect) has no reason to live any higher.
  - **The same move also applies within a single feature, purely to cut wiring volume.** The
    "···" settings menus (rename, cover, invite link, delete, manage access, revoke) stayed
    same-domain the whole time — no cross-feature risk — but each Route still had to construct
    6-8 permission-gated props just to wire one dropdown. `BaulSettingsMenuContainer`/
    `ChapterSettingsMenuContainer`/`PersonaSettingsMenuContainer` own the whole menu (trigger,
    items, modals, permission checks) behind a single entity-object prop (`baul`, or
    `baulId`+`chapterId`/`persona`).
  - **A `components/` file whose only remaining job is composing containers gets folded into
    its Route instead of kept as a separate shell.** `ChaptersView`, `PhotosView`, and
    `PersonaDetailScreen` used to exist purely to assemble `PageHeader`/`Hero`/`Tabbar` chrome
    around the containers above. `Route → Component → Container` isn't illegal in a runtime
    sense — React renders it fine, the app and every test proved that — but it defeats the
    actual point of `components/`: renderable in isolation from props alone, so its story is a
    real presentational contract. A file that only ever renders containers already fails that
    test transitively (its story needs store data and a `MemoryRouter` just to not crash), so
    keeping it a separate `components/` file bought nothing but an extra hop. `BaulRoute`/
    `ChapterRoute`/`PersonaDetailRoute` now render that chrome directly — a Route is *never*
    restricted from importing `containers/` (only `components/` is boundary-checked), so there
    is no version of this composition that's actually off-limits to a Route. State genuinely
    shared across the whole screen (`ChapterRoute`'s multi-select mode, needed by its header,
    Hero, photo grid, FAB, and batch-action bar all at once) stays inline in the Route rather
    than being forced into one container that would then have to leak it back out to its
    siblings.
  - **Exception**: a Route may call `api.*` directly, bypassing `store/`/`useCases/`, when the
    result is never cached or shared across routes — there's no state a store would own. This
    covers: blob downloads (`api.photos.download`), one-off share-link creation consumed
    immediately by the share sheet, on-demand pagination handed to a child as a fetch callback
    (cover/avatar pickers), secrets that must always be re-fetched fresh rather than cached
    (invite link regeneration), fire-and-forget submissions with no resulting state
    (`api.support.submit`), and pre-auth bootstrapping flows that run before domain stores are
    populated (accepting a baúl invite). If a second call site needs the same data, or the data
    must survive navigation, move it to a store instead of adding a second direct caller.
- **`features/<domain>/containers/*.tsx`** — a 5th peer of `routes/`/`components/`/`useCases/`/
  `native/`, for a tab or panel that's rendered by another feature's Route (e.g. `BaulRoute`
  rendering `BaulPersonasTabContainer`) rather than owning a URL of its own. Unlike
  `components/`, it's **not** scoped by the `componentBoundaryRule` ESLint rule — a container
  reads its own store slice and calls its own `useCases/`/`useAsyncAction()` directly, same
  as a Route would. It may call `useNavigate()` itself, but only for navigation that's a
  direct, ID-only consequence of its own action (e.g. "after moving these photos, go to the
  target chapter" — needs nothing but `baulId` + the result's id); navigation that depends on
  route context it doesn't own (a viewer's `backgroundLocation`, a `basePath`, a `returnTab`
  shared with a sibling tab) stays a callback prop from the composing Route, same as today.
  A consequence of being store-backed rather than prop-driven: a container can't render in
  Storybook from props alone, so its behavior is covered by Vitest + jsdom + React Testing
  Library instead (see [`testing.md`](testing.md)), styled after
  `features/sharing/routes/SelectBaulForShareRoute.test.tsx` — seed the store, mock the use
  cases, `render()` inside a `MemoryRouter`.
  - **A container can also be a hook instead of a component**, when its caller's layout can't
    fit it into one prop slot. `usePhotoViewerActions` (`features/photos/containers`) is
    `PhotoViewer`'s "···" menu plus add/edit/share-recuerdo — the menu's trigger lives in the
    header, its "tap to edit" date affordance lives inline in the body, and its modals render
    as overlays, three places a single `trailing`-style prop can't reach. The hook owns the
    state/use cases and returns `{ buildMenuItems, modals, onAddRecuerdo, ... }`; `PhotoViewer`
    itself stays in `components/` and is 100% pure — it takes an already-resolved
    `menuItems: PhotoViewerMenuItem[]` prop and imports neither the hook nor `store/`/
    `useCases/`/`react-router-dom` directly, which is exactly what the `componentBoundaryRule`
    checks for. Colocate the hook's test next to it in `containers/`, not next to the component
    in `components/`: the ESLint rule scopes the whole `components/**` glob, test files
    included, and a test mocking `useCases/` to exercise the hook would trip it.
  - **A container can compose another container** — only `components/` is barred from
    containing one. `PhotoViewerContainer` (`features/photos/containers`) owns everything a
    photo viewer needs regardless of which collection of photos it's browsing (tag/share/
    download, baúl-cover, date, removal-request/delete, recuerdos) via `usePhotoViewerActions`,
    and takes only a photo list — never a `chapterId`. The two actions that genuinely need
    "which chapter" (move, chapter-cover) live one level up in
    `ChapterPhotoViewerContainer` (`features/chapters/containers`), which wraps
    `PhotoViewerContainer` and injects them as `extraMenuItems`.
    `usePhotoViewerActions.buildMenuItems(extraItems?)` always appends `extraItems` before the
    destructive entries (removal-request/delete), so no caller — present or future — can
    accidentally sort a destructive action anywhere but last. `ChapterPhotoViewerRoute` (the
    old `PhotoViewerRoute`) and `PersonaPhotoViewerRoute` each just decide *which photos* to
    show and mount the container that matches their scope; neither duplicates recuerdo/menu
    logic, and adding a third photo-viewer entry point (a global search, a "photos with no
    date" filter, anything) only means picking one of these two containers, never rebuilding
    the viewer.
  - **The same "search every cache, don't require the origin" idea used for cover reconciliation
    extends to per-photo mutations.** `deletePhoto`/`changePhotoDate`
    (`features/photos/useCases`) used to require a `chapterId` purely to know which cache slot
    to patch. Since either photo viewer can trigger them without knowing that, they now call
    `removePhotoFromCaches`/`updatePhotoInCaches` on both `useBaulesStore` (chapter/loose
    slices) and `usePersonasStore` (`personaPhotos`, keyed by persona — a photo can be tagged
    with several) — each searches every cached key for a match instead of taking one. Chapter
    aggregate metadata (covers, counts, date ranges) is always refetched afterwards rather
    than conditionally, since the caller no longer knows whether the photo belonged to one.
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
- **Linting**: ESLint (flat config, `app/eslint.config.js`) — `typescript-eslint` recommended,
  `react-hooks` (`rules-of-hooks` + `exhaustive-deps`), `react-refresh`, and the
  `components/` import-boundary rule described above. Deliberately narrow: it isn't the full
  `recommended-latest` React Hooks ruleset (that pulls in React Compiler-oriented rules this
  codebase hasn't been written against) or type-checked TS rules — widen it as a deliberate,
  separate decision, not a side effect of an unrelated change. Run via `npm run lint`, part of
  `./scripts/verify frontend`. Scoped away from `prototype/`, `ds-bundle/`, `public/` and other
  `.gitignore`d local scaffolding.
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
│                  #   <domain>/routes/     — *Route.tsx container components (one per URL)
│                  #   <domain>/components/ — presentational only: no router/store/useCases imports
│                  #   <domain>/useCases/   — orchestration layer: api.* + store writes
│                  #   <domain>/containers/ — self-sufficient tab/panel rendered by another
│                  #                          feature's shell component; store/useCases allowed
│                  #   <domain>/native/     — Capacitor plugin bridges/wiring, when the feature has one
├── store/         # Zustand: one store per domain + uiStore (toasts/modals)
├── design-system/ # Domain-independent UI — see ADR 0002
└── utils/         # Utility functions/helpers
```

See [`testing.md`](testing.md) for what test level to reach for.
