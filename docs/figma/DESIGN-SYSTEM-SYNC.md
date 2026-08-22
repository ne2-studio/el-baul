# Figma Design System Sync

This documents an in-progress effort to build an editable Figma library — tokens,
components, patterns and screen mockups — generated from the app's real design-system
(`app/src/design-system/**`, Storybook, `docs/DESIGN.md`), using the Figma MCP tools
(`figma-generate-library` / `figma-use` skills).

The goal: every screen of the consumer app eventually gets an editable Figma frame
composed from real design-system components, not hand-drawn shapes — so designers can
work from something that matches the shipped code, and stays re-syncable as the code
evolves.

## State file

[`design-system-state.json`](./design-system-state.json) is the resumable ledger:
Figma file key, page/section/component/variable/style node IDs, and known issues.
It is updated after every meaningful milestone (new component, new page, structural
fix) and is the source of truth for resuming — not conversation history.

**To resume this work in a new session:**
1. Load the `figma-generate-library` skill (and `figma-use` alongside it).
2. Read `design-system-state.json` for the current file key and node IDs.
3. Re-verify state against the live file (`get_metadata` / `search_design_system`) before
   creating anything — the ledger records intent, the Figma file is ground truth.

## File structure

The Figma file (`fileKey` in the state file) is organized Storybook-style, one
top-level Figma page per category, mirroring `app/src/design-system/*`:

| Figma page | Mirrors |
|---|---|
| `Overview` | entry point / getting-started (former single "Design System" page) |
| `Foundations` | design tokens: color, radius, spacing, typography, elevation, icons |
| `Components` | `design-system/components/**` |
| `Layouts` | `design-system/layouts/**` |
| `Patterns` | `design-system/patterns/**` |
| `Feature Components` | reusable non-generic components under `features/*/components` |
| `Screens` | real screen compositions, grouped into one section per feature (e.g. `Sharing`) |

Figma components are file-scoped, not page-scoped: an instance on any page can
reference a component living on any other page. Splitting into pages is purely for
navigability, not a technical constraint.

## Scope so far

Pilot: `ClaimPersonaScreen` (feature `sharing`) plus its full dependency chain —
`Button`, `BackButton`, `StickyHeader`, `PageContainer`, `PageHeader` (variant
`stacked` only), `Card`, `ActionListItem`, `Avatar`. Tokens cover only what those
components use (single light mode — `.dark` is unfinished scaffolding per
`docs/DESIGN.md`, out of scope).

`Avatar` was added after the code introduced a shared component (previously each
screen painted its own avatar circle inline). Modeled as a 20-variant set —
`State` (`Image` / `Initials Plain` / `Initials Colored` / `Icon`) × `Size`
(`6`/`8`/`10`/`14`/`24`, matching `AvatarSize` in code, rendered at `unit*4px`) — plus
a `TEXT` property for the initials. `Card`'s hardcoded avatar circle was replaced with
a real `Avatar` instance (`Initials Plain`, `Size=14`).

`Avatar`'s `Image` variants show a real photo (the app's own
`storybookAvatars.abuela` fixture, `public/storybook-fixtures/avatar-1.svg`) instead of
a flat gray placeholder — exported to PNG and applied as an `IMAGE` fill via
`upload_assets`, one call per size since the tool only accepts a single target node
per upload. Avatar's own circular clip crops out the export's non-transparent corners,
so no extra masking was needed.

**Real icons.** All 48 entries of `app/src/design-system/foundations/icons/icons.ts`
were imported as real, pixel-accurate Lucide vector components — one Figma component
per catalog key (`Icon/{key}`), living in a new `Icons` section on the `Foundations`
page. Built by fetching each icon's actual SVG from `lucide-static` (not hand-drawn or
memorized path data) and running it through `figma.createNodeFromSvg()` +
`figma.createComponentFromNode()`, then rebinding the stroke to a new
`color/icon/default` variable (aliased to `color/text/foreground`). This replaced the
old generic `Icon/Placeholder` component (a bare circle used as an `INSTANCE_SWAP`
stand-in), which is now removed — `Avatar`'s `Icon` variant, `ActionListItem`'s icon
slot (default + the `ClaimPersonaScreen` instance's `UserPlus` override), and both
`BackButton` chevrons now reference real icon components instead.

Scaling to more screens means widening this scope component-by-component, following
the same discovery → foundations → components → screen workflow, not rebuilding
from scratch.

**Code Connect** was attempted but is blocked: it requires a Dev or Full seat on an
Organization/Enterprise Figma plan (confirmed via `whoami` — the file's plans are all
starter/pro). Everything else (components, variants, tokens, icons) is unaffected —
Code Connect only adds a code snippet next to the component in Dev Mode.

**`BaulRoute` shell (feature `baules`), no Storybook source.** `BaulRoute` mounts the
same chrome — `PageHeader` (variant `row`) + `Tabbar` + a `Body` slot — across its 3
tabs (`recuerdos`/`capitulos`/`personas`), each swapping in a different tab container.
None of `BaulRoute`/its 3 tab containers/`PersonaCard`/`ChapterCard` have a Storybook
story — built straight from the `.tsx` source instead, which the workflow supports
just as well (Storybook fixtures are a convenience, not a requirement). First screen
built: `BaulPersonasScreen` (Screens > Baul). New reusable pieces this required:
- `PageHeader` gained a real `row` variant (it was previously `stacked`-only) — the
  original single component was renamed to `Variant=stacked` and combined with the new
  `Variant=row` into a proper variant set; the underlying node id for `stacked` didn't
  change, so `ClaimPersonaScreen`'s existing instance kept working untouched.
- `Tabbar` (Layouts): 3-variant set (`Active=Historia|Capítulos|Familia`), each just 3
  `TabButton` instances with the matching one toggled active — modeled specifically for
  `BaulRoute`'s 3 fixed tabs, not as a fully generic N-tabs component.
- `TabButton`, `IconButton`, `EmptyState`, `SwimlaneLabel`, `SimpleFAB` (Components):
  each built with only the variant axes this one screen needs (documented in the state
  ledger's `baulShellNote`) — e.g. `IconButton` has no size/tone variants yet. Expand
  them later rather than rebuilding, once another screen needs the missing axis.
- `WorkspaceSwitcherTrigger`, `PersonaCard` (Feature Components, `Baules`/`People`
  sections): both dropdown triggers in the header (`WorkspaceSwitcherContainer`,
  `BaulSettingsMenuContainer`) are modeled **closed-state only** — no dropdown menu
  content — a deliberate scope call, not an oversight.
- 2 more real icons imported (`chevronDown`, `menu`) — used directly as raw
  `lucide-react` imports in this feature's code, not part of the `icons.ts` catalog,
  but built with the same real-SVG pipeline as the other 48.

**`BaulCapitulosScreen`** (Screens > Baul), the second of the 3 tabs, built the same way
— straight from `BaulChaptersTabContainer.tsx` + `ChapterCard.tsx`, no Storybook source.
New pieces:
- `ChapterCard` gained a real `Cover` variant axis (`Fallback` / `Photo`) — the photo
  variant uses the app's own `storybookPhotos.beach` fixture (same SVG→PNG→re-upload
  round-trip as `Avatar`'s photos).
- `LooseChapterCard` (Feature Components > Baules): the "fotos sueltas" virtual-chapter
  tile, its 3x3 collage using `FotosSueltasCollage`'s real fallback palette
  (`COLLAGE_COLORS`) since no loose-photo fixtures exist in the repo.
- `ExpandableFAB` (Components > Actions): built closed-state only (single circular
  button) — the 2-action expanded state (`Nuevo capítulo` / `Subir fotos`) was not
  built, the same "skip the overlay" scope call as the header dropdowns.

**`BaulRecuerdosScreen`** (Screens > Baul), the third and last tab, closes out the full
`BaulRoute` — built by cloning `BaulCapitulosScreen`'s shell (PageHeader row + Tabbar +
Body) and swapping `Tabbar` to `Active=Historia` + replacing `Body`'s content, from
`BaulFeedTabContainer.tsx` + `FeedTab.tsx`. Modeled the `Features:BaulFeedEnabled`
toggle-ON path (merged recuerdos + photo-upload-batch + chapter-created cards) rather
than the toggle-off recuerdo-only fallback, since it exercises more of the feed's real
component surface — and left out the "Nueva actividad" / `isNew` highlight state (all
cards shown as already-seen). 3 new Feature Components, each a real `COMPONENT` (not a
one-off frame) so they can be instanced like `PersonaCard`/`ChapterCard`:
- `RecuerdoFeedCard`, `ChapterCreatedFeedCard` (Feature Components > Memories)
- `PhotoBatchCard` (Feature Components > Photos)

All 3 share 2 new Components > Data Display pieces: `FeedCardHeader` (avatar + "name did
action" line + relative timestamp — built with no trailing slot, so
`RecuerdoFeedCard`'s edit/share icon buttons were deliberately left out) and
`ChapterBadge` (the pill-shaped "en «chapter name»" link, `bg-primary/10` pre-blended to
a flat solid per the known opacity+variable-bind limitation below).

Along the way, review caught: a stale typo baked into `Tabbar`'s own `Active=Historia`
variant (its own tab button's label read "Activa", not "Historia" — dormant until this
was the first screen to actually use that variant) — fixed at the component definition;
and all 3 Baul screens' FABs were positioned horizontally centered under their screen,
when the real code (`SimpleFAB`/`ExpandableFAB`, both `fixed bottom-6 right-5`) anchors
them to the bottom-right corner instead — fixed across all 3.

`BaulRoute` (all 3 tabs) is now fully built out.

**`ChapterRecuerdosScreen` / `ChapterFotosScreen`** (new `Screens > Chapter` section —
kept separate from `Screens > Baul` since `ChapterRoute` is its own top-level route, not
a `BaulRoute` tab), built from `ChapterRoute.tsx` (the real-chapter branch, not the
virtual "Fotos sueltas" one) + `RecuerdosFeed.tsx` / `PhotoSwimlanes.tsx`. 2 new shared
components:
- `Hero` (Components > Layouts) — cover image + `bg-gradient-to-t` black overlay + serif
  (`Lora`) title + `Inter` subtitle, from `layouts/Hero.tsx`. The gradient needed a
  hand-computed `gradientTransform` matrix (see gotchas below).
- `ChapterTabbar` (Components > Layouts) — a 2-variant set (`Active=Recuerdos` /
  `Active=Fotos`), built the same way as `Tabbar` but kept as its own component since
  `Tabbar`'s 3 variants are hardcoded to `BaulRoute`'s own tab labels, not swappable.

Both screens share `PageHeader`(row) with its default `Leading` swapped from
`WorkspaceSwitcherTrigger` to `BackButton` (`Style=Label`, "Volver") and `Trailing`'s
`IconButton` icon swapped to `Icon/moreOptions` (the `ChapterSettingsMenuContainer`
"···" menu — modeled closed-only, same as every other dropdown trigger in this file),
plus a shared `Hero` instance (title "Verano en la playa", reusing `ChapterCard`'s
example chapter name and the `storybookPhotos.beach` fixture as its cover). Body content
differs per tab: `ChapterRecuerdosScreen` reuses `RecuerdoFeedCard` with its
`ChapterBadge` hidden (`showChapterBadge={false}` in code — a recuerdo already inside its
own chapter's tab doesn't repeat which chapter it's in) plus a `SimpleFAB`
("Escribe lo que recuerdas", `Icon/bookOpen`); `ChapterFotosScreen` is a `SwimlaneLabel`
("2019") + an inline 3-column photo grid (`layoutMode: HORIZONTAL` +
`layoutWrap: 'WRAP'`, matching `grid-cols-3 gap-2`) of the same beach fixture — not
promoted to its own shared component yet since only one screen uses it — plus a
`SimpleFAB` ("Subir fotos", `Icon/add`).

**`PhotoViewerScreen`** (new `Screens > PhotoViewer` section), built from `PhotoViewer.tsx`
+ `PhotoViewerHeader.tsx` + `RecuerdosList`/`RecuerdoCard`/`RecuerdoInput.tsx`, using the
mobile-stack layout (photo on top, recuerdos panel below — not the desktop side-by-side
layout). 3 separate screens, one per `RecuerdosList`/`recuerdosLoading` state (same
"separate frame per state" precedent as the two `ChapterRoute` tabs): **Default** (2
`RecuerdoCard`s), **Sin recuerdos** ("Sé el primero en añadir un recuerdo"), **Cargando
recuerdos** (spinner glyph placeholder). 4 new components, all flat solid colors — no
variable binding — since this whole surface is `bg-foreground/95` +
`text-background/*`, a dark-surface/light-text inversion the existing variables aren't
scoped for: `PhotoViewerHeader` (close + counter + `···` menu, icons' strokes overridden
to flat off-white), `PersonBadge` (`Avatar` Initials Colored + nickname pill),
`RecuerdoCard` (the on-image dark sibling of `RecuerdoFeedCard`/`FeedCardHeader` — a
different visual shell, not just a recolor: no card border, no chapter badge, no
edit/share icons), and `RecuerdoInput` (idle state only — the focused/has-text/"Guardado"
states weren't built). `PhotoStage`'s swipeable carousel is a plain static image frame,
same "skip live interaction" call as everywhere else in this file.

**`PhotoViewerScreen-DesktopSideNavigation`** (`PhotoViewerDesktopSideNavigation` story) is
a 4th screen, fixed at 1280×900 (`storybook/viewports.ts`'s desktop size) instead of
hugging like every other screen in this file — `PhotoViewer.tsx` genuinely is a
fixed-viewport overlay at that breakpoint (`md:h-full`). 2-column layout: `PhotoStage`
`flex-1` on the left, the same `Info` column at `w-1/3` on the right with a left border,
reusing the exact same `PhotoViewerHeader`/`PersonBadge`/`RecuerdoCard`/`RecuerdoInput`
instances as the mobile screens. Added the `md:flex` prev/next chevron `IconButton`s
overlaid on the photo (hidden on mobile) — hit the "resizing a nested instance child can
silently no-op" issue again (see gotchas) on the icon's size; fixed by re-deriving
`strokeWeight` from the icon's actual settled width instead of fighting the no-op.

**`TagPersonScreen` / `WriteMemoryScreen`** (new `Screens > Contributions` section), built
from `ContributionSuggestionScreen.tsx` / `WriteMemorySuggestionScreen.tsx` — the two
full-screen contribution suggestions `BaulRoute` shows before the feed. Share a header
(title + "Ahora no →" skip link, no back button) recomposed inline rather than reusing
the `PageHeader`(row) instance — its default `Leading`/`Trailing` are instances meant for
*swapping* (see gotchas), not appending a plain-text title + a `plain`-variant `Button`.
New components: `SelectionRow` (Components > Data Display — 2-variant
`Selected=true`/`false`, `Avatar` + name + checkbox, extracted from
`PersonaSelectionList`/`TagPersonasModal`'s row) and `RecuerdoInputLight` (Feature
Components > Memories — the `theme='light'` sibling of `PhotoViewerScreen`'s dark
`RecuerdoInput`, kept as its own component rather than a variant since the two themes'
chrome differs enough). `TagPersonScreen` shows 4 example personas (1 with a real photo
avatar, 1 pre-selected) plus the sticky footer's ghost/primary button pair;
`WriteMemoryScreen` reuses `RecuerdoInputLight` idle. Both reuse the
`storybookPhotos.beach` fixture for the sticky photo panel at a fixed 260px height
(approximating `photoStageHeight()`'s `clamp()`, not modeled exactly).

**Basic component gap-fill** (user request: "add the missing basic design-system
components") — compared `app/src/design-system/components/**` against the ledger and
filled the real gaps, skipping full-screen feedback states (`ErrorScreen`,
`FullScreenLoading`, `AccessDeniedScreen`, `MaintenanceScreen`, `ConnectivityLostScreen`,
`CrashFallback`, `Toast`, `BatchOperationProgress`, `LoadingSpinner`) as already
out-of-scope screen-level states, and `ChatBubble`/`dropdown-menu` as feature- or
Radix-primitive-shaped rather than basic reusable primitives:
- New `Components > Forms` section: `Input` (default + a separately-named
  support/multiline example — `Input.tsx` has 7 visually-unrelated variant strings, so
  only the 2 most generic were built, same "different shells, not one variant axis" call
  as `RecuerdoCard`/`RecuerdoFeedCard`), `Toggle` (`Checked=true`/`false`), `Select`
  (single state, no open-dropdown overlay, same "skip open-overlay states" precedent as
  every dropdown trigger in this file).
- `Components > Data Display` gained `RoleBadge` (`Tone=default`/`onImage`, the latter
  shown against a dark backdrop so its white-on-transparent styling is visible in
  isolation), `CounterBadge`, `NewDot`.
- `Components > Feedback` gained `Notice` (neutral/destructive).
- New `Components > Overlays` section: `BottomSheetModal`(`size=sm`) + `ModalActions`,
  shown as one representative confirm-delete sheet against a flat backdrop-tint context
  frame rather than an empty shell — `size=sm` has no header/handle slot in code, so
  there's no meaningful "empty" version to build.

**`PhotoViewerScreen-PortraitMobile` / `PhotoViewerScreen-PortraitDesktop`** model
`PhotoStage`'s real `object-contain` letterboxing for a portrait photo that doesn't fill
its (landscape-ish) container: the stage frame's fill is a flat dark-surface color, and
the photo is a separate child rectangle sized to its real aspect ratio (a new
`storybookPhotos.portrait` fixture, 800×1200, uploaded the same SVG→PNG round-trip way as
every other real photo here) and centered, height-constrained on both mobile and desktop
— leaving visible side margins, wider on desktop since that container is wider. Swapped
the example recuerdo/persona to "Marta" so not every screen in the file uses the same
beach/abuela pair.

**`PhotoViewerScreen (Mobile, muchas etiquetas)`** models the `taggedPersonas.length > 0`
`flex-wrap` branch with enough `PersonBadge` instances (7) in a `layoutWrap: 'WRAP'` frame
to actually wrap 3 rows at 342px width — the other `PhotoViewerScreen`s only exercise the
single-badge case. Hit the `resize()`-resets-`AUTO`-sizing-mode gotcha yet again on the
wrap frame itself (see gotchas) — fixed the same way as `ChapterFotosScreen`'s photo
grid, re-setting `counterAxisSizingMode = 'AUTO'` after all badges were appended.

**`UploadConfirmationScreen`** (2 screens: Empty, "3 fotos, hover eliminar") and
**`PhotoBatchGridRoute` (selección activa)** round out the Contributions section.
`UploadConfirmationScreen`'s empty state wraps the existing `EmptyState` component in a
dashed `DropZone` frame (icon swapped to `Icon/upload`); its selected state shows the
`group-hover` remove button on the first photo as an *always-visible* overlay — a static
mockup can't represent `:hover`, so it's modeled as always-on, the same way selection-mode
checkboxes elsewhere are. `PhotoBatchGridRoute` reuses `PhotoSwimlanes`' selection-mode
`PhotoCell` chrome (primary border + filled check) on 2 of 6 cells, plus a new
`ActionBarButton` component (icon-on-top-of-label pill) instanced 6× for every action
`BatchPhotoActionsBar` can show in a batch-grid context (`chapterId=null`, so "Crear nuevo
capítulo" *is* included, unlike a real chapter's `ChapterRoute`) — wrapped in a
390px-clipped frame to simulate the real `overflow-x-auto` horizontal scroll instead of
shrinking the buttons to fit. 2 more ad hoc icons imported (not in `icons.ts` —
`BatchPhotoActionsBar.tsx` imports `Tag`/`CalendarOff` directly, same convention as
`chevronDown`/`menu`): `Icon/tag`, `Icon/calendarOff`.

**`UploadingScreen`**, from `UploadingScreen.tsx`: the full-screen loading state shown
while a batch actually uploads — a real `BaulIcon` import (fill-based SVG, unlike every
stroke-based icon elsewhere in this file) in a tinted rounded box, `PhotoStack` (3 real
photos fanned/rotated, matching `PhotoStack.tsx`'s exact offsets/rotations), title, and a
static progress line (no animation — one frozen frame, "Subiendo 1 de 3 fotos"). Not
promoted to a reusable component since nothing else here needs `BaulIcon`/`PhotoStack` yet.

Also fixed: `PhotoBatchGridRoute`'s action bar had the wrong background —
`BatchPhotoActionsBar.tsx` is `bg-card` (white), not the page's off-white
`background`; rebound to `color/bg/card`.

Remaining screens beyond the Baúl/Chapter/PhotoViewer/Contributions shells — sharing
flows beyond `ClaimPersonaScreen`, `PhotoBatchViewerRoute`'s empty/loaded states, etc. —
are not yet started.

## Known gotchas (read before writing more `use_figma` scripts)

- **Paint opacity + variable binding doesn't render.** If a paint's `color` is bound to
  a Figma variable, the paint-level `opacity` field is silently ignored by the renderer
  (confirmed by sampling exported PNG pixels — alpha channel was 255 despite
  `opacity: 0.12` in the returned metadata). Workaround: pre-blend the color against its
  expected backdrop and set a flat, non-variable-bound solid paint instead.
- **`resize()` resets sizing modes to `FIXED`.** Set `layoutSizingHorizontal/Vertical`
  or `primaryAxisSizingMode` to `AUTO`/`HUG` *after* calling `resize()`, never before.
- **Can't `appendChild` into an `INSTANCE`.** Only properties/text on nodes that already
  exist inside an instance can be edited. Slot-less layout wrappers (`StickyHeader`,
  `PageContainer`) can't hold arbitrary nested instances — composite components that use
  them recreate the same visual shell inline instead of nesting an instance.
- **Icons are now real.** All 48 `icons.ts` entries exist as real Lucide vector
  components (`Icon/{key}`) on `Foundations > Icons`. `figma-code-connect` mapping to
  the actual `lucide-react` exports is still pending.
- **`figma.createNodeFromSvg()` + `figma.createComponentFromNode()` is the reliable way
  to import real icons.** Fetch the actual SVG (e.g. from `lucide-static` on unpkg) —
  never hand-type or recall path data from memory — then convert. `stroke="currentColor"`
  resolves to flat black; rebind every `VECTOR`'s stroke to a color variable afterward.
- **`editComponentProperty()` on an `INSTANCE_SWAP` default resizes unoverridden
  instances to the new default's natural size**, breaking centering — re-check size/
  position on every instance driven by that property after changing its default.
- **Setting x/y on a nested child inside an `INSTANCE`** can throw `This property
  cannot be overridden in an instance: relative-transform` — usually means the parent
  is auto-layout and already governs that child's position; no fix needed if so.
- **`upload_assets` accepts a real photo for a fill.** POST an SVG to get back an
  `imageHash` too, but that hash renders blank when applied directly as a fill on
  another node — export the uploaded node to PNG (`download_assets`) and re-upload
  *that* PNG with `nodeId` set to get a working `IMAGE` fill. One `upload_assets` call
  per target node (its `nodeId` param only takes one at a time).
- **Multi-path icons are multiple `VECTOR` nodes, not one.** `createNodeFromSvg` turns
  each `<path>`/`<circle>`/`<line>` into its own vector layer. Recoloring with
  `findOne(type === 'VECTOR')` only touches the first one, leaving the icon visibly
  two-toned (this exact bug shipped once with `UserPlus`: the `+` recolored, the person
  glyph stayed dark). Always `findAll` when rebinding icon stroke color.
- **Icon color follows the consuming component's own variant, not a property of the
  icon itself** — same as code (`Icon`/lucide has no color of its own, it inherits
  `currentColor` from whatever wraps it). `ActionListItem`'s `Variant` (`plain` /
  `card` / `destructive`) already is that axis; its icon vector must be rebound to
  `color/brand/primary` (plain/card) or `color/status/destructive` (destructive) at
  the component definition, once, so every instance gets it for free — don't add a
  redundant "icon color" variant/property on top of `Variant`.
- **`appendChild` into auto-layout puts the node last in flow, ignoring manual x/y.**
  When replacing a child at a specific position (e.g. swapping `Card`'s avatar slot),
  capture the old child's index first and `insertChild(index, ...)`, not `appendChild`.
- **`Avatar`'s `Size` variant values are Tailwind spacing units, not pixels.** Circle
  diameter is `unit * 4px` (6→24px … 24→96px) — resize components to that, not to the
  raw variant number.
- **Icon `strokeWeight` does NOT auto-scale with `resize()`.** Unlike a browser scaling
  an SVG viewBox, Figma's `strokeWeight` is a separate absolute-px value. Every icon
  placed at a non-24px size needs its `VECTOR` children's `strokeWeight` manually set to
  `2 * (instance.width / 24)` after every resize — no automatic mechanism exists.
- **Auto-layout components need BOTH `primaryAxisSizingMode` and
  `counterAxisSizingMode` explicitly `'FIXED'`** for anything that must stay a fixed
  circle/square (FABs, icon-only buttons) — leaving one on its `AUTO` default lets it hug
  down to its icon's own size on that axis. Hit twice (`ExpandableFAB`, `IconButton`).
- **`node.appendChild(x)` returns `void`, not `x`.** `const child = parent.appendChild(y)`
  silently assigns `undefined` — create the node first, `appendChild` it as its own
  statement, then keep using the original variable.
- **A `findAll`/`findOne` scoped to a whole component instance can reach into nested
  instances' own internals** (e.g. `Avatar`'s initials text) if the search predicate
  isn't specific enough — matching on loose conditions like "first/other text node"
  inside a `FeedCardHeader` instance overwrote the nested `Avatar`'s initials text
  instead of the header's own name/timestamp text. Prefer structural indexing
  (`instance.children[i]`) over a broad `findAll(type === 'TEXT')` when a component
  nests other instances that also carry text.
- **`SimpleFAB`/`ExpandableFAB` are `fixed bottom-6 right-5` in code — right-aligned, not
  centered.** Don't assume a FAB is horizontally centered under its screen just because
  it visually reads that way at a glance; check the actual Tailwind classes.
- **A component variant that nothing has used yet can carry a dormant bug** (a stale
  typo, wrong size, etc.) that only surfaces the first time a screen actually selects
  it — re-verify content, not just structure, on any variant used for the first time,
  even if the component set as a whole was "already built and reviewed".
- **A vertical linear gradient paint needs a hand-computed `gradientTransform` matrix** —
  there's no angle/direction shortcut. For handles `start=(0.5,0)`, `end=(0.5,1)`,
  `widthAxis=(1,0)` in normalized node space, the matrix is
  `[[end.x-start.x, widthAxis.x-start.x, start.x], [end.y-start.y, widthAxis.y-start.y, start.y]]`
  = `[[0,0.5,0.5],[1,0,0]]` for a top-to-bottom fade. A first guess of
  `[[0,1,0],[-1,0,1]]` rendered as a diagonal/near-opaque mess — only caught by
  screenshot, not inferable from the types.
- **`PageHeader`'s `row` variant ships default `Leading`/`Trailing` instances already
  populated** (`WorkspaceSwitcherTrigger` / `IconButton → Icon/menu`), not empty slots.
  For a screen needing different content, swap the existing instance's
  `mainComponent` in place — `appendChild`ing a new node into `Trailing` still throws
  "New parent is an instance or is inside of an instance", because the slot already
  holds something to swap, not append to.
- **Setting a frame's `primaryAxisSizingMode`/`counterAxisSizingMode` to `AUTO` *before*
  that same frame's own `resize()` call gets silently undone by the `resize()`** — same
  root cause as the already-documented rule above, but easy to miss on a plain container
  (not a component): the property read back as `AUTO` in the same script, yet the frame
  never hugged, because `resize()` ran after. Fix: set sizing modes to `AUTO`/`HUG` as
  the *last* step, once all children are appended and no more `resize()` calls remain.

- **No color variable is scoped for a dark-surface/light-text inversion.** `PhotoViewer`'s
  `bg-foreground/95` + `text-background/*` surface has no matching `FRAME_FILL`
  dark-background variable (`color/text/foreground` is `TEXT_FILL`-only) — used flat
  pre-blended solid colors instead of introducing a variable for one screen family;
  revisit if a second dark-surface screen appears.

## Related skills

- `figma-generate-library` — component/token build workflow (phases, checklists).
- `figma-use` — Plugin API syntax rules.
- `figma-code-connect` — not yet run; do this once the icon library question above is
  resolved, so Code Connect mappings don't need redoing.
