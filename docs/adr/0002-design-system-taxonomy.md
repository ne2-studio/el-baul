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

Current inventory (Storybook `title` as of this ADR):

| Category | Members |
|---|---|
| `Foundations/Icons` | `Icon`, `Gallery`, `Guidelines`, `BaulIcon` |
| `Components/Actions` | `Button` |
| `Components/Forms` | `Input`, `PartialDatePicker` |
| `Components/Navigation` | `TabButton` |
| `Components/Feedback` | `Toast`, `LoadingSpinner`, `BlockingLoadingOverlay`, `EmptyState`, `BatchOperationProgress` |
| `Components/DataDisplay` | `Card` |
| `Patterns/Forms` | `EditInfoModal`, `DateModal` |
| `Patterns/Media` | `PhotoStage` |
| `Features/Baules` | `CreateBaulForm` |
| `Features/Chapters` | `CreateChapterForm`, `ChapterSelector` |
| `Features/People` | `NuevaPersonaModal`, `EditPersonaInfoModal`, `EditBiografiaModal`, `PersonasTab` |
| `Features/Photos` | `PhotoViewer`, `PhotoViewerHeader`, `CoverPhotoPickerModal`, `DeletePhotoModal`, `MoveModal`, `RemovalRequestModal`, `RemovalRequestsList`, `BatchPhotoActionsBar` |
| `Features/Memories` | `RecuerdoCard`, `RecuerdoInput`, `RecuerdosFeed`, `RecuerdosList` |
| `Features/Sharing` | `ManageAccessModal`, `RevokeAccessModal` |
| `Features/Subscription` | `PlanLimitModal` |
| `Features/Profile` | `ProfileMenuModal` |
| `Screens` | `Error`, `Support/Help`, `Support/Form`, `Onboarding/Invitacion`, `Profile/MiSuscripcion`, `Person/Detail` |

`preview.tsx` sets `parameters.options.storySort` to `['Foundations', 'Components',
'Patterns', 'Layouts', 'Features', 'Screens']` so the sidebar reflects this order (generic →
domain-specific) instead of alphabetizing `Components` before `Foundations`.

Longer-term dependency rule once the physical layout catches up (see Consequences):

```
Screens → Features → Patterns → Components → Foundations
```

Never the reverse — a `Component` must never import a `Feature`, a `Pattern` must never
import a domain type, etc. This is the rule that keeps the "design system" from becoming
quietly coupled to the domain, which is the failure mode this ADR exists to prevent.

## Consequences

- **Phase 1 (done, this ADR's companion commit)**: every existing story's `title` was
  reclassified. No file was moved, no import was changed, no component was renamed. This was
  intentionally the cheapest possible first step — Storybook's own navigation improves
  immediately without touching runtime code.
- **Physical layout is still flat and mixed.** All 70 components (45 with stories, 25
  without) still live in `src/app/components/`, regardless of category. `Foundations`,
  `Patterns`, and `Components` are mixed in the same directory as `Features` and `Screens`.
  This ADR documents the target taxonomy; it does not claim the codebase matches it yet.
- **`Layouts` has zero members today.** `PageContainer` and `StickyHeader` are the closest
  candidates (they take `children`, don't import domain types, and are composed into nearly
  every screen) but neither has a story yet. Giving them stories under `Layouts` is a
  reasonable next step, not a prerequisite for this ADR.
- **25 components have no story at all**, including `BottomSheetModal` — the overlay
  primitive that almost every `Features/*` modal in the table above wraps. It's arguably the
  single highest-leverage missing story: documenting it once in `Components/Overlays` covers
  the shared behavior (open/close, backdrop, safe-area handling) that today is only ever seen
  indirectly through a dozen domain-specific modals.
- **Some classifications are judgment calls, not facts**, and should be revisited if they
  start to chafe:
  - `BaulIcon` is under `Foundations/Icons` because it takes only `SVGProps` and no domain
    data — but it's visually and conceptually tied to the "baúl" brand concept, so
    `Features/Baules` would also be defensible.
  - `DateModal` and `EditInfoModal` are under `Patterns` because their props are generic
    (`PhotoDate`, plain strings) even though today's only call sites are domain-specific
    (editing a photo's date, a baúl's or chapter's name/description). If either grows a
    domain-shaped prop, it should move to `Features`.
  - `RecuerdoInput` is under `Features/Memories` rather than `Patterns` despite having no
    domain-type import, because its copy (rotating reflection prompts) is specific to the
    "recuerdo" concept, not a generic text composer.
- **Not addressed by this ADR**: separating container components (that fetch data via hooks/
  API) from presentational ones for Storybook purposes; this matters for `Features` and
  `Screens` in particular, where some existing components already do this cleanly and others
  don't.
