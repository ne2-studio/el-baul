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
- Full route screens (`PersonaDetailScreen`, `MiSuscripcionScreen`, `InvitacionScreen`).

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

1. **Foundations** — visual primitives and raw design tokens: icons and (later) color/type/
   spacing scales. Not really "components" so much as the app's raw material.
2. **Components** — generic UI with no import of an El Baúl domain type (`Persona`,
   `Chapter`, `Photo`, `Recuerdo`, `Baul`, `BaulRole`). Subgrouped by function: `Actions`,
   `Forms`, `Navigation`, `Feedback`, `DataDisplay`, `Overlays`.
3. **Patterns** — reusable compositions of Components that still take only primitive/generic
   props, not domain entities. They don't know what a `Persona` or `Chapter` *is*, even if
   they're currently only invoked from one domain context.
4. **Layouts** — page-structure components (fixed header, safe areas, max width, FAB
   position) that take `children`/slots and don't know what's inside them. No members exist
   yet — see Consequences.
5. **Features** — components that import a domain type directly and speak El Baúl's
   vocabulary. Grouped by domain area: `Baules`, `Chapters`, `People`, `Photos`, `Memories`
   (Recuerdos), `Sharing`, `Subscription`, `Profile`.
6. **Screens** — full route pages assembled from Layouts + Features + Components.

**Litmus test** for Components vs. Patterns vs. Features: could this render correctly in a
different app (CashClarity, say) with just a theme swap and no El Baúl-specific data shape?
If it only needs strings/booleans/callbacks → Components or Patterns. If it needs a `Persona`
or a `Photo` → Features.

That test needs one refinement, found while classifying single-purpose confirmation dialogs
(`DeleteChapterModal`, `DeletePhotoModal`, `RemovalRequestModal`, `RevokeAccessModal`,
`TagPersonasModal`, `NuevoRecuerdoModal`): none of them import a domain *type*, but none of
them are reusable either — each is hardcoded, copy and all, to one specific destructive or
domain action. The real test isn't just "does it import a domain type," it's "could this be
dropped into a different call site for a different purpose." `EditInfoModal`/`DateModal`/
`PhotoStage` pass that test (generic mechanism, several unrelated call sites); the
confirmation dialogs above don't, so they're `Features` despite the clean type signature.

`preview.tsx` sets `parameters.options.storySort` to `['Foundations', 'Components',
'Patterns', 'Layouts', 'Features', 'Screens']` so the sidebar reflects this order (generic →
domain-specific) instead of alphabetizing `Components` before `Foundations`. The full,
current inventory is Storybook itself, not a table in this file — a hand-maintained list here
would start rotting the day after this ADR merges. Browse the sidebar (`npm run storybook`) or
grep story `title`s for the authoritative list.

Dependency rule for both the Storybook grouping and the physical file layout (see below):

```
Screens → Features → Patterns → Components → Foundations
```

Never the reverse — a `Component` must never import a `Feature`, a `Pattern` must never
import a domain type, etc. This is the rule that keeps the "design system" from becoming
quietly coupled to the domain, which is the failure mode this ADR exists to prevent.

### Physical layout

The taxonomy above is also the physical directory layout under `app/src/`:

- `design-system/foundations/`, `design-system/components/{actions,forms,navigation,
  feedback,data-display,overlays,ui}`, `design-system/patterns/{forms,media}`,
  `design-system/layouts/` — every file classified as `Foundations`, `Components`,
  `Patterns`, or `Layouts`. No file here imports a domain type or a `features/*` module.
- `features/<domain>/components/` — every file classified as `Features` or `Screens` lives
  next to the `*Route.tsx` container(s) that render it, one folder per domain (`baules`,
  `chapters`, `people`, `photos`, `memories`, `sharing`, `profile`, `chat`, `auth`, `support`).
  This colocates a Route with the presentational component(s) it renders, matching the
  pre-existing `features/<domain>/components/*Route.tsx` convention rather than inventing a
  parallel `screens/` tree.

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
- **Judgment calls made along the way, worth revisiting if they start to chafe**:
  - `BaulIcon` is under `Foundations/Icons` because it takes only `SVGProps` and no domain
    data — but it's visually and conceptually tied to the "baúl" brand concept, so
    `Features/Baules` would also be defensible.
  - `DateModal` and `EditInfoModal` are under `Patterns` because they're a generic mechanism
    reused for unrelated purposes (see the litmus-test refinement above), even though every
    current call site happens to be domain-specific. If a future call site needs
    domain-shaped behavior instead of a generic one, that instance should move to `Features`
    rather than dragging the generic component along with it.
  - `RecuerdoInput` is under `Features/Memories` rather than `Patterns` despite having no
    domain-type import, because its copy (rotating reflection prompts) is specific to the
    "recuerdo" concept, not a generic text composer.
- **Not addressed by this ADR**: separating container components (that fetch data via hooks/
  API) from presentational ones for Storybook purposes; this matters for `Features` and
  `Screens` in particular, where some existing components already do this cleanly and others
  don't.
