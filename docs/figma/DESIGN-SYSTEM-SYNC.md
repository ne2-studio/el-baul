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

## Related skills

- `figma-generate-library` — component/token build workflow (phases, checklists).
- `figma-use` — Plugin API syntax rules.
- `figma-code-connect` — not yet run; do this once the icon library question above is
  resolved, so Code Connect mappings don't need redoing.
