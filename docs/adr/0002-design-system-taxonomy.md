# 2. Design system taxonomy: Foundations, Components, Patterns, Layouts, Features, Screens

## Status

Accepted — 2026-07-25

## Context

Every story in `app/` (45 of them, plus the icon guidelines doc) lived under a single
Storybook title: `Components/<Name>`. That one bucket mixed:

- Generic UI primitives with zero knowledge of El Baúl's domain (`Button`, `Card`, `Input`,
  `Toast`, `TabButton`).
- Generic reusable compositions that take primitive props but no domain entities
  (`EditInfoModal` takes `title`/`initialName`/`initialDescription` strings, not a `Chapter`
  or `Persona`; `PhotoStage` takes `src`/`alt`/`direction`, not a `Photo`).
- Components that are deeply tied to El Baúl's domain and import its types directly
  (`PhotoViewer`, `NuevaPersonaModal`, `ManageAccessModal` import `Photo`, `Persona`,
  `BaulRole`).
- Full route screens (`PersonaDetailScreen`, `NotificationPreferencesScreen`, `InvitacionScreen`).

With everything alphabetized under one label, there was no way to tell — from the sidebar
alone — what's safely reusable UI kit versus what's load-bearing on El Baúl's domain model.
That distinction matters concretely: a change to `Button` should be evaluated against "does
this break every screen in the app," while a change to `PersonaDetailScreen` only needs to be
evaluated against the persona feature.

An external draft proposed a six-tier taxonomy (Foundations / Components / Patterns /
Layouts / Features / Screens) with example component names. Those names were written without
access to this codebase and don't match what actually exists here (e.g. it invented
`GroupedGallery`, `SearchAndFilter`, `TabbedPageLayout` — none of which exist in `app/`). This
ADR keeps the six-tier structure, which is a real improvement over the flat list and over
Atomic Design's atoms/molecules/organisms (whose boundaries are notoriously arguable — "is a
search bar a molecule or an organism?"), but re-derives the classification from El Baúl's
actual 45 stories and their actual prop signatures instead.

## Decision

Adopt this taxonomy for Storybook's `title` (and, later, for physical file layout — see
Consequences):

The primary goal is to improve Storybook navigation and make component location communicate
the component's level of reuse inside El Baúl. This is not an attempt to build a
product-agnostic UI library or a design system intended to be reused across different
products.

1. **Foundations** — visual primitives and raw design tokens: icons and (later) color/type/
   spacing scales. Not really "components" so much as the app's raw material.
2. **Components** — small reusable UI mechanisms that are not tied to a concrete El Baúl
   feature. They may take primitive props or small shared value types. Subgrouped by
   function: `Actions`, `Forms`, `Navigation`, `Feedback`, `DataDisplay`, `Overlays`.
3. **Patterns** — reusable compositions of Components that take primitive props or small
   shared value types. They are still visual mechanisms rather than concrete feature
   behavior, even if they're currently only invoked from one domain context.
4. **Layouts** — page-structure components (fixed header, safe areas, max width, FAB
   position) that take `children`/slots and don't know what's inside them. No members exist
   yet — see Consequences.
5. **Features** — components that implement a concrete El Baúl capability and speak the
   vocabulary of a domain area. Grouped by domain area: `Baules`, `Chapters`, `People`,
   `Photos`, `Memories` (Recuerdos), `Sharing`, `Profile`.
6. **Screens** — full route pages assembled from Layouts + Features + Components.

**Litmus test** for Components vs. Patterns vs. Features: does this component represent a
visual mechanism reusable in different El Baúl contexts, or does it implement a concrete
feature capability? If it is a reusable mechanism (`PartialDatePicker`, `DateModal`,
`PhotoStage`) → Components or Patterns. If it is hardcoded to a specific domain action or
workflow (`DeleteChapterModal`, `NuevaPersonaModal`) → Features.

That test needs one refinement, found while classifying single-purpose confirmation dialogs
(`DeleteChapterModal`, `DeletePhotoModal`, `RemovalRequestModal`, `RevokeAccessModal`,
`TagPersonasModal`, `NuevoRecuerdoModal`): none of them import a domain *type*, but none of
them are reusable either — each is hardcoded, copy and all, to one specific destructive or
domain action. The real test isn't just "does it import a domain type," it's "could this be
dropped into a different call site for a different purpose." `EditInfoModal`/`DateModal`/
`PhotoStage` pass that test (reusable mechanism, several unrelated call sites); the
confirmation dialogs above don't, so they're `Features` despite the clean type signature.

The taxonomy is oriented toward navigation, discoverability, and code placement. It is not an
ontological classification of every UI element and it does not require every file under
`design-system/` to be independent of El Baúl's product domain or reusable outside this
product.

`preview.tsx` sets `parameters.options.storySort` to `['Foundations', 'Components',
'Patterns', 'Layouts', 'Features', 'Screens']` so the sidebar reflects this order (reusable →
feature-specific) instead of alphabetizing `Components` before `Foundations`. The full,
current inventory is Storybook itself, not a table in this file — a hand-maintained list here
would start rotting the day after this ADR merges. Browse the sidebar (`npm run storybook`) or
grep story `title`s for the authoritative list.

Main dependency constraint for the physical file layout (see below):

```
Features and Screens → design-system
```

Features and Screens may compose elements from `design-system/`. Files under
`design-system/` should not import concrete feature implementations: feature components,
feature hooks, routes, API clients, services, or other application-state infrastructure.
They may depend on small shared value types from the product, such as `PhotoDate`, when
those types are a natural part of the component contract and do not couple the component to
one concrete feature.

### Physical layout

The taxonomy above is also the physical directory layout under `app/src/`:

- `design-system/foundations/`, `design-system/components/{actions,forms,navigation,
  feedback,data-display,overlays,ui}`, `design-system/patterns/{forms,media}`,
  `design-system/layouts/` — every file classified as `Foundations`, `Components`,
  `Patterns`, or `Layouts`. Files here avoid concrete feature implementations. Some may use
  shared value objects or product types when doing so simplifies their contract without
  reducing their internal reuse across El Baúl.
- `features/<domain>/components/` — every file classified as `Features` or `Screens` lives here,
  one folder per domain (`baules`, `chapters`, `people`, `photos`, `memories`, `sharing`,
  `profile`, `chat`, `auth`, `support`), strictly presentational (no router/store/useCases
  imports — see [`frontend.md`](../architecture/frontend.md)). The `*Route.tsx` container(s)
  that render them live in a sibling `features/<domain>/routes/`, not colocated in the same
  folder — there is still no separate `screens/` tree; `routes/` replaces what used to be
  Route-and-presentational files interleaved in one `components/` folder, distinguished only by
  a naming suffix.

**Presentational components reused across more than one domain's routes** (e.g. `ChaptersView`
is rendered as the background screen under a photo-viewer overlay reached from `baules`,
`chapters`, and `photos` routes, via the `location.state.backgroundLocation` pattern — see
`ScrollToTop.tsx`) live in the folder of their *primary* domain and are imported cross-feature
by the others (`import { ChaptersView } from '@/features/baules/components/ChaptersView'`).
There is no dedicated "shared screens" folder — introducing one would add a third physical
tier (`design-system` / `screens` / `features`) the rest of the codebase doesn't have, for a
handful of components. `ErrorScreen` is the one component originally filed under `Screens`
that turned out to have no domain coupling at all (generic `title`/`message`/`actionLabel`
props, reused by five unrelated routes) — it was reclassified to
`Components/Feedback/ErrorScreen` and physically lives in `design-system/components/feedback/`.

## Consequences

- **Phase 1 (done)**: every existing story's `title` was reclassified, no file moved. The
  cheapest possible first step — Storybook's own navigation improved immediately without
  touching runtime code.
- **Phase 2 (done)**: `BottomSheetModal` (the overlay primitive nearly every domain modal
  wraps), `PageContainer`/`StickyHeader` (populating the previously-empty `Layouts` category),
  and the 23 remaining components with no story all got one — every component in the app now
  has a story except `ScrollToTop` (renders `null`; it's a pure route-change side effect, not a
  visual component). Every one of the resulting 190 stories was verified to load without a
  console error or thrown exception.
- **Phase 3 (done)**: the physical file layout now matches this taxonomy (see "Physical
  layout" above) — `design-system/` and `features/<domain>/components/` replaced the flat
  `app/components/` directory entirely. All cross-file imports (154 files moved, ~165 files
  with import statements updated) go through the `@/` alias rather than relative paths, so a
  file's physical location and its import specifiers agree.
- Importing a product type from `design-system/` is not, by itself, considered a boundary
  violation. The relevant question is whether the dependency couples the component to a
  concrete feature implementation or prevents reasonable reuse within El Baúl.
- **Judgment calls made along the way, worth revisiting if they start to chafe**:
  - `BaulIcon` is under `Foundations/Icons` because it takes only `SVGProps` and no domain
    data — but it's visually and conceptually tied to the "baúl" brand concept, so
    `Features/Baules` would also be defensible.
  - `DateModal` and `EditInfoModal` are under `Patterns` because they're a reusable mechanism
    reused for unrelated purposes (see the litmus-test refinement above), even though every
    current call site happens to be domain-specific. If a future call site needs
    domain-shaped behavior instead of a reusable one, that instance should move to `Features`
    rather than dragging the reusable component along with it.
  - `RecuerdoInput` is under `Features/Memories` rather than `Patterns` despite having no
    domain-type import, because its copy (rotating reflection prompts) is specific to the
    "recuerdo" concept, not a reusable text composer.
- **Not addressed by this ADR**: separating container components (that fetch data via hooks/
  API) from presentational ones for Storybook purposes; this matters for `Features` and
  `Screens` in particular, where some existing components already do this cleanly and others
  don't.
