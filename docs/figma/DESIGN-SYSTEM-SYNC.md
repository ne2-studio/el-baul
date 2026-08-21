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
| `Foundations` | design tokens: color, radius, spacing, typography, elevation |
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
`stacked` only), `Card`, `ActionListItem`. Tokens cover only what those components use
(single light mode — `.dark` is unfinished scaffolding per `docs/DESIGN.md`, out of
scope).

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
- **No shared `Avatar` component in code.** Each screen paints its own avatar circle
  inline (image or initials fallback) — this is not a design-system gap to "fix" in
  Figma, replicate it as-is per screen.
- **Icons are placeholders.** `ActionListItem`'s icon slot is a generic vector exposed
  via `INSTANCE_SWAP`, not a real Lucide icon — swapping in a real icon library / Code
  Connect mapping is still pending.

## Related skills

- `figma-generate-library` — component/token build workflow (phases, checklists).
- `figma-use` — Plugin API syntax rules.
- `figma-code-connect` — not yet run; do this once the icon library question above is
  resolved, so Code Connect mappings don't need redoing.
