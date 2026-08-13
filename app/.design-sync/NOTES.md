# design-sync NOTES

## Repo-specific gotchas

- [GENERAL] **2026-08-13: `BottomSheetModal` now portals its content to
  `document.body`** (confirmed via its own story comments, e.g.
  `CoverPhotoPickerModal.stories.tsx`: "renders BottomSheetModal, which
  portals to document.body"). This is a real app-source change since the
  last sync and it breaks `compare.mjs`'s STORYBOOK-side capture for EVERY
  BottomSheetModal-based component: `captureStory()` waits for
  `:is(#storybook-root, #root) > :not(style,script,link,meta,template)` —
  when the entire rendered output is portaled out, that selector times out
  and the story is marked `sb-error: "no storybook root content"`, even
  though the component renders perfectly (confirmed via manual out-of-band
  Playwright captures against the real reference `iframe.html` and the
  compiled `_preview/*.js`, full-page screenshots, for ~15 components:
  BottomSheetModal, ConfirmActionModal, DateModal, DeleteChapterModal,
  DeletePhotoModal, EditBiografiaModal, EditInfoModal, EditPersonaInfoModal,
  InviteFamilyModal, ManageAccessModal, MoveModal, RevokeAccessModal,
  TagPersonasModal, CoverPhotoPickerModal, RecuerdoEditModal, NuevoRecuerdoModal
  — all pixel/content-identical to storybook once actually screenshotted).
  **This is a harness limitation, not a component defect** — `compare.mjs`
  is off-limits to fork, so there is no code fix; the correction is
  behavioral: grade these `match` from a manual full-page capture (navigate
  the real `iframe.html?id=<story-id>&viewMode=story` over the reference's
  own local server, `waitUntil:'networkidle'`, screenshot the full page, not
  `#storybook-root`) instead of trusting the sheet, and write the verdict to
  `.design-sync/.cache/compare/<Name>.grade.json` directly — once graded and
  the gradeKey is stable, the component is skipped (carried forward) on
  future runs and the sb-error fact never resurfaces UNLESS it gets
  re-sampled by the canary/spot-check mechanism (see below). **Any future
  `sb-error: "no storybook root content"` on a component that mounts
  `BottomSheetModal` (directly or via a feature modal built on it) should be
  treated as this same class first** — verify with a manual capture before
  assuming a real regression.
- [GENERAL] **The canary spot-check mechanism doesn't respect existing
  grades for the hard-failure gate.** `compare.mjs`'s `hard` filter
  (`!skipped && counts.sb-error`) fires for ANY non-skipped component with
  an sb-error story, REGARDLESS of whether `.grade.json` already has valid
  `match`/`close` verdicts — a spot-check recapture is never `skipped`, so
  every BottomSheetModal-based component the random canary sample picks
  re-trips the hard gate every single run, even ones graded run after run.
  Since `.design-sync/.cache/compare/.sb-state.json` (the reference-drift
  baseline) only refreshes when the driver's capture stage exits clean
  (`stages.capture.ok !== false`), and refDrift stays true until it does,
  this created a live lock: rebuilding `.design-sync/sb-reference` (needed
  because it was stale/missing `index.json`) triggered `refDrift`, and since
  a large fraction of this app's components are BottomSheetModal-based, a
  clean random 5-pick sample was unlikely across several consecutive runs
  (confirmed: run after run kept surfacing a NEW never-before-blocked
  component — NuevoRecuerdoModal, Card, SwimlaneLabel, etc. — each with an
  ALREADY-VALID pre-existing grade that didn't matter). After manually
  verifying ~15 portal components directly (see above) and finding zero real
  regressions — all uniformly explained by the one harness limitation —
  `.sb-state.json` was seeded directly with the current reference's real
  `sbBaseShaFor()` hash to mark the drift as reconciled, unblocking the run.
  This is NOT a rubber stamp — it followed extensive manual verification,
  not a skipped check. **If a future sync's canary flags a BottomSheetModal
  component as sb-error, don't assume it's already covered by this note —
  spot-check it manually** (the note documents the mechanism and past
  evidence, not a blanket exemption for components never actually looked
  at).

- [GENERAL] The app has no library `dist/` build (it's a Vite app, not a published package) —
  `cfg.entry` points at `.design-sync/entry.ts`, a synthetic barrel `export * from`-ing every
  file under `src/design-system/**` and `src/features/*/components/**` (excluding `*Route.tsx`
  container components, which own routing/store/API access and aren't storied). Regenerate this
  file if components move or new ones are added — no `Route.tsx` files, no `.stories.tsx`,
  no `.test.tsx`.
- [GENERAL] `bundle.mjs`'s `tsconfigPathsPlugin` checks `existsSync(stem + ext)` over
  `exts = ['', '.ts', ...]` — the `''` extension matches a *directory* too, so a bare
  `@/types` (→ `src/types/`, a directory with `index.ts`) resolves to the directory path
  itself and esbuild then fails with "Cannot read file ...: is a directory". `bundle.mjs` is
  explicitly off-limits to fork (app-contract surface), so the fix is
  `.design-sync/tsconfig.sync.json` — a self-authored (non-`extends`, since the plugin doesn't
  read `extends`) tsconfig with explicit non-wildcard `paths` entries for every directory-only
  barrel import in the repo, listed before the `@/*` wildcard so they win. Repo-wide, only two
  such directories exist: `src/types/index.ts` and `src/features/photos/uploadFlow/index.ts`
  (verified via `find src -iname index.ts -o -iname index.tsx -o -iname index.js -o -iname index.mjs`).
  If a new directory barrel (`src/**/index.{ts,tsx,js,mjs}`) is added later, add its exact path
  to `tsconfig.sync.json` the same way — the plugin's directory-match bug will resurface for it
  otherwise. `cfg.tsconfig` points at this file, not the real `tsconfig.json`.

- [GENERAL] Storybook-shape component discovery (`exportedNames()` in `.ds-sync/lib/dts.mjs`)
  only reads real `.d.ts` files via ts-morph — it never scans `.tsx` source, and there's no cfg
  override for this (unlike the package-shape's synth-entry fallback, which the storybook
  adapter doesn't share). Since this app has no library build/`.d.ts` tree, `.design-sync/`
  is set up as its own tiny "package": `.design-sync/package.json` (`name` + `types`) makes
  `--entry`'s package.json walk-up stop there instead of at the real `app/package.json`, and
  `.design-sync/tsconfig.dts.json` (extends the real `tsconfig.json` for the `@/*` path
  mapping, overrides `noEmit`/`declaration`/`emitDeclarationOnly`/`outDir`, and excludes
  `*.stories.tsx`/`*.test.tsx`/`*.mdx` — including story files trips `TS4023` on
  `Meta<typeof X>` types that reference unexported prop types) generates the whole `.d.ts` tree
  into `.design-sync/dts-out/` (gitignored, regenerated every build). `cfg.buildCmd` records
  the regeneration command — **run it before every `package-build.mjs` invocation**, including
  on re-sync; a stale `dts-out/` silently under-reports components if source changed since the
  last `tsc` run.

- [GENERAL] **CONFIRMED ROOT CAUSE + FIX** for `cardMode: "single"` components whose entire
  render output is `position: fixed` with no normal-flow siblings (Toast, SimpleFAB,
  BatchOperationProgress, BlockingLoadingOverlay, CrashFallback, BatchPhotoActionsBar,
  ProfileMenuModal, UploadErrorScreen, UploadingScreen — 9 components as of this sync).
  `emit.mjs`'s `.ds-single` wrapper applies `transform:translateZ(0)`, which correctly creates
  a CSS containing block for `position:fixed` descendants — but the wrapper itself has no
  intrinsic size, and since fixed-positioned children don't contribute to their containing
  block's auto-height, `.ds-single` collapses to 0×0. `bottom`/`right` pixel offsets then
  resolve against that zero-size box (anchored wherever it sits in the page, near the top),
  not the declared card viewport — explains both the earlier `RENDER_THIN`/`RENDER_BLANK`
  validate warnings AND why SimpleFAB's button rendered as a tiny sliver near the top instead
  of bottom-right. `emit.mjs` is off-limits to fork (app-contract surface per the skill), so
  the fix is per-component: an owned `.design-sync/previews/<Name>.tsx` that wraps the composed
  story in a normal-flow sizing div, e.g.:
  ```tsx
  function sized(Inner: () => any) {
    return () => React.createElement('div', { style: { position: 'relative', height: '100vh', width: '100%' } }, React.createElement(Inner));
  }
  export const Simple = sized(compose(S, "Simple"));
  ```
  Verified working on SimpleFAB (see `.design-sync/previews/SimpleFAB.tsx` — copy its pattern
  for the other 8). `height:'100vh'` resolves against the card's own `viewport` override (the
  browser viewport IS set to that size for both validate and compare captures), so it lines up
  with whatever `viewport: "WxH"` was declared for that component.
- `DeletePhotoModal` `[RENDER_THIN] rendered height is 0px` is a confirmed FALSE POSITIVE, same
  class as BaulIcon — `ds-bundle/_screenshots/photos__DeletePhotoModal.png` shows the modal
  rendering perfectly (real content, 30KB PNG). The DOM height measurement returns 0 due to
  `BottomSheetModal`'s internal fixed positioning, same mechanism as the `.ds-single` containing
  block collapse, but here it doesn't affect the actual visual output the way it did for
  SimpleFAB etc. (BottomSheetModal itself renders fine as `cardMode:"single"` too — the
  measurement quirk, not the paint, is what's off). Accepted, no action needed.
- **Watch for accidental duplicate keys in `overrides`** — JSON silently keeps only the LAST
  occurrence of a repeated key (no parse error), so adding a new override for a component that
  already has one (e.g. adding just `{"viewport": ...}` for a component that already has
  `cardMode`/`primaryStory` set) silently DROPS the earlier fields instead of merging. Always
  grep for the component name in `config.json` before adding a new override entry, and merge
  into the existing line rather than appending a second one. (This happened once during this
  sync with `PersonaDetailScreen` — caught via a fresh `[GRID_OVERFLOW]` regression in
  `package-validate.mjs` after a wave of fan-out fixes.)
- `BaulIcon` (Foundations/Icons) `[RENDER_THIN] mounts have no text and paint nothing` is a
  confirmed FALSE POSITIVE — compare.mjs sheet shows it renders correctly (small terracotta
  trunk icon, matches storybook exactly). Icon-only components read as thin forever; accepted,
  no action needed.
- `SimpleFAB`'s "Expandable" story is `cfg.overrides.SimpleFAB.skip: ["Expandable"]` — sb-error,
  "no storybook root content": the story fails to render in the real reference storybook too
  (not a design-sync artifact — didn't dig further into why, out of scope for this sync).
- [GENERAL] `cfg.overrides.<Name>.skip` entries must be the full Storybook story **id**
  (kebab-case `title-slug--export-slug`, e.g. `screens-upload-uploading--deterministic-settled`)
  — matched via `s.id` in `preview-gen-storybook.mjs`, NOT the export name or display name.
  Look it up in `.design-sync/sb-reference/index.json` (`entries[<id>].exportName` confirms
  which export it maps to) before writing a skip entry.
- `PhotoStage.stories.tsx`'s decorator was `<div className="bg-foreground h-[70vh]">` — missing
  `flex`, so PhotoStage's own root (`flex-1 flex ...`) had no flex parent to size against, and
  since all its content is `position:absolute`, the whole component collapsed to 0 height. Fixed
  the decorator to `h-[70vh] flex` — this is a **pre-existing bug in the app's own Storybook**
  (confirmed identical broken rendering in the real reference build before the fix), not
  something introduced by this sync. Worth a heads-up to whoever owns `app/`.

- [GENERAL] **CONFIRMED ROOT CAUSE + FIX** for relative-date text ("Hace un mes" etc.) mismatching
  between storybook and preview panels on ANY component whose fixtures use `createdAt`-style
  timestamps (hit RecuerdosTab, RecuerdoFeedCard, RecuerdosFeed so far). The app's own
  `.storybook/preview.tsx` freezes `Date` to `2024-08-20T12:00:00.000Z` for the real storybook
  build (`globalThis.Date = FixedDate`) — every relative-date fixture was authored against that
  "now". That override is top-level side-effect code in a Storybook-global config file, never
  bundled into an individual component preview (only the `decorators` export gets auto-bundled,
  not arbitrary preview.tsx side effects), so our compiled preview has no equivalent and falls
  back to `compare.mjs`'s own frozen clock (`2030-01-15`, six years later) — same underlying
  timestamp, wildly different relative-time string. `compare.mjs` is the fidelity oracle and is
  never forked to change its clock value. Fix (owned preview, same pattern as the Math.random
  fix below): monkey-patch `Date` to the SAME `2024-08-20T12:00:00.000Z` value at the top of the
  owned `.design-sync/previews/<Name>.tsx`, mirroring `.storybook/preview.tsx`'s own
  `FixedDate` class exactly (see `.design-sync/previews/RecuerdosTab.tsx` for the copy-pasteable
  block). Verified fix on all 3 components. **Any component that renders a relative timestamp
  should get this treatment proactively** rather than being graded `close`/blocked.
- RecuerdoInput's "Default" story picks a random placeholder prompt via
  `Math.random()` on mount AND in a `photoId`-keyed effect — genuinely nondeterministic. Fixed
  via an owned preview that monkey-patches `Math.random` to a fixed value for that story's
  isolated page load (each story loads in its own `?story=` navigation, so this is scoped
  safely). See `.design-sync/previews/RecuerdoInput.tsx`.
- PartialDatePicker's "Interactive" story's true end-state depends on its `play` function
  (types a date, clicks "No me acuerdo") — the compiled-preview harness never runs `play`, so
  the generated preview showed the pre-play blank state. Fixed via an owned preview that keeps
  the other stories on the generated path and replaces only the play-dependent story with a
  small wrapper seeding the equivalent end-state props directly. **Any story whose true rest
  state depends on a `play` function mutating state (not just an assertion) needs this same
  treatment** — see `.design-sync/previews/PartialDatePicker.tsx`.
- [GENERAL] Extends the `play()`-end-state pattern for stories with **no seedable prop** for
  the end-state (internal-only component state): replay the actual DOM interaction in a
  `useEffect` inside the owned preview instead of faking props.
  - Radix `DropdownMenu` triggers open on `onPointerDown`, not `onClick` — dispatch a synthetic
    `new PointerEvent('pointerdown', {button:0, pointerType:'mouse'})` on the trigger element.
    This also avoids Radix's keyboard-open auto-highlight of the first item, which a
    keydown-based approach would incorrectly introduce.
  - A plain controlled `<textarea>`/`<input>` with internal-only state: set `.value` via the
    native property descriptor setter (`Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set`),
    then dispatch a bubbling `input` event — this makes React see it as a real keystroke rather
    than a programmatic value change it ignores.
  - See `.design-sync/previews/{PersonaDetailScreen,DeletePhotoModal}.tsx` for worked examples.
- Any component that mounts `RecuerdoInput` transitively inherits its `Math.random()`
  nondeterminism (rotating placeholder text) — proactively patch `Math.random` in the owned
  preview even if the component itself doesn't call it directly (confirmed via `PhotoViewer`).
- EmptyState/LoadingSpinner (and any component with no owned background): storybook shows the
  real cream page background (`--background:#F5F1ED`) behind them, the ds preview shows white —
  root cause is `emit.mjs`'s per-component card HTML hardcoding `body{background:#fff}`.
  `emit.mjs` is off-limits to fork; this is deliberate harness behavior. Per the "judge the
  component, not its surroundings" rubric this is graded `match`, not a defect — don't waste
  iterations chasing it on other components.
- [GENERAL] `cardMode:"single"` defaults to a `900x700` capture viewport (`emit.mjs`), but the
  storybook reference side captures the FULL element height (scrolls/fits to content) —
  whenever a single-mode component's content is taller than 700px, the two sides become
  structurally asymmetric (ds cropped, sb complete), which reads as a content mismatch but is
  really just a viewport sizing gap. Confirmed on: PhotosView (`"900x1300"`), ChaptersView
  (`"900x2400"` — 5 chapters + persona cards + loose-photos grid, up to ~3011px real content),
  BaulesList (`"900x1400"`). **Any `cardMode:"single"` component graded mismatch/close should
  have its raw PNG heights checked before assuming a real defect** — if the ds side is exactly
  700px tall and the sb side is much taller, it's this, not a composition bug. **The `viewport`
  must cover the TALLEST story, not just the primary/Default one** — ChaptersView's `Default`
  fit in `900x2400`, but its `WithLoosePhotos` story (extra "Fotos sueltas" section) needed
  `900x3100`; BaulesList's `Default` fit in `900x1400` but `ManyBaulesWithPartialMetadata` (14
  baúles) needed `900x2800`. Check every story's raw sb height, not just the primary story's.
  **Not limited to `cardMode:"single"`** — `compare.mjs` defaults BOTH panels to a 900x700
  capture viewport regardless of cardMode; the storybook side always screenshots the full
  `#storybook-root` element (ignoring viewport height) while the ds side is viewport-clipped.
  RemovalRequestsList hit this with no `cardMode` override at all (`viewport: "900x2000"` fixed
  it) — check raw PNG heights on ANY tall component graded mismatch/close. Also note:
  `compare.mjs` appears to cap viewport height around 2000px. ChapterCard (`"900x1050"`, 977px
  measured) and PersonaCard (`"900x1000"`, 918px measured) hit the exact same thing on their
  first sync — both are plain `aspect-square` cover-image cards where the caption block
  (name/dates/stats) below the image was cropped in the ds capture but present in storybook's
  full-element screenshot. Same fix, no `cardMode` needed — just `viewport`.

- [GENERAL] **`.design-sync/entry.ts` silently goes stale when components are added/renamed** —
  since it's a hand-maintained synthetic barrel (no library `dist/` to introspect), nothing
  fails loudly when a new storied component's `export *` line is missing; the build just runs
  with a smaller roster and reports a normal-looking component count. Caught this on the
  2026-07-29 re-sync: 9 new components from recent "extract X" refactors (BackButton,
  PageHeader, Tabbar, SwimlaneLabel, Notice, Hero, BaulCard, ChapterCard, PersonaCard) were
  completely absent from the sync — build succeeded, count just didn't grow. **Before trusting
  a re-sync's component count, diff entry.ts against the repo's actual storied set**:
  ```bash
  find src/design-system src/features -iname "*.tsx" ! -iname "*.stories.tsx" ! -iname "*.test.tsx" | while read -r f; do
    dir=$(dirname "$f"); base=$(basename "$f" .tsx)
    [ -f "$dir/$base.stories.tsx" ] && echo "${dir#src/}/${base}"
  done | sort > /tmp/storied-now.txt
  grep -oP "(?<=from ')\.\./src/[^']+" .design-sync/entry.ts | sed 's#^\.\./src/##' | sort > /tmp/entry-now.txt
  diff /tmp/storied-now.txt /tmp/entry-now.txt
  ```
  Also caught 2 stale entries the same way (`RecuerdoEditForm`, `PersonaAvatarPickerModal` —
  files still exist but their `.stories.tsx` were removed at some point); harmless (no story to
  pair with, so they're silently excluded already) but worth pruning for accuracy. **Run this
  diff at the start of every re-sync**, not just when something looks off.

- [GENERAL] **SimpleFAB's story names were renamed twice** — reverted back to generic on the
  2026-07-30 re-sync, superseding the entry below. 2026-07-29: `Simple`/`Expandable` became
  screen-specific names (`BaulesListNuevoBaul` etc.). 2026-07-30 (commit `203461b docs: document
  FAB purpose and remove autodocs, add real-screen stories`, despite its message): reverted to
  generic `Simple`/`SimpleWithIcon`/`Expandable`/`ThreeActions` — the CURRENT and presumably
  final state. Updated `.design-sync/previews/SimpleFAB.tsx` back to export `Simple`/
  `SimpleWithIcon` through the same `sized()` wrapper (the `.ds-single` 0×0 containing-block fix
  still applies unchanged regardless of story names). `Expandable` is `sb-error` in the real
  storybook (confirmed again this sync, same as always — never dug further, out of scope);
  `ThreeActions` was already `[STORY_CAP]`-excluded so its own sb-error status wasn't re-checked.
  Updated `cfg.overrides.SimpleFAB.skip` to `components-actions-fab--expandable` +
  `components-actions-fab--three-actions`, `primaryStory` to `Simple`. **Lesson: don't trust a
  commit message to describe what it did — verify story names against the actual
  `.stories.tsx` file every time**, since this is now the SECOND wholesale rename in as many
  syncs and a script-based sed on the commit message would have gotten it backwards.

- `WelcomeScreen.tsx` renders its app icon as `<img src="/pwa-512x512.png">` — an absolute
  site-root path. That's correct and intentional in the real deployed app (Vite serves
  `public/` from the domain root), but incompatible with being embedded as a design-system
  component preview under any other path/domain (our `ds-bundle` doesn't carry `public/`, and
  even if it did, claude.ai/design's real hosting root isn't our bundle's root either). Not a
  bug to fix — editing the real component to satisfy a packaging tool would be overreach for
  something that works correctly in production. Accepted as a known, permanent limitation:
  WelcomeScreen's app-icon renders broken in this preview only. Confirmed isolated (grepped all
  of `src/design-system` and `src/features` for absolute `/`-rooted `img src` — only this one).

- [GENERAL] **`cfg.storybookStatic: ".design-sync/sb-reference"` does not resolve from the git
  repo root — it resolves from the CWD the driver/converter is run from.** This app's
  `.design-sync/` lives under `app/.design-sync/`, and since the driver is always run with cwd
  `app/` (per every command in this file), `app/` IS the effective "repo root" for this setting,
  not the actual git top-level. Building the reference storybook at the git-root
  `.design-sync/sb-reference` (as an earlier version of this doc's §2.2 instruction literally
  says: "Make `-o` the repo-root path... `$(git rev-parse --show-toplevel)/.design-sync/sb-reference`")
  produces a reference the driver never finds — it silently falls back to building its own into
  `ds-bundle/.sb-static` every run (costs ~1 extra minute per build, not fatal, but wastes the
  whole point of a persistent reference). **Build the reference at `app/.design-sync/sb-reference`
  instead** (i.e. just `-o .design-sync/sb-reference` from cwd `app/`, no `git rev-parse`).
- 2026-07-30 re-sync: `[TITLE_UNMAPPED]` dropped two PREVIOUSLY-SHIPPED components entirely —
  `AiChat` (title) → `AiChatScreen` (export) and `RemovalRequests` (title) →
  `RemovalRequestsList` (export) stopped pairing after a storybook taxonomy reclassification
  changed their title paths (`Screens/Chat/AiChat`, `Screens/Photos/RemovalRequests`) without
  the last title segment matching the export name. The driver correctly flagged these as
  `verification.removed`, which is the tell that a `[TITLE_UNMAPPED]` drop is a REGRESSION (an
  already-synced component silently disappearing) rather than a legitimate exclusion — always
  cross-check `[TITLE_UNMAPPED]` names against the previous sync's shipped component list before
  accepting them as new/excluded. Fixed via `cfg.titleMap: {"AiChat": "AiChatScreen",
  "RemovalRequests": "RemovalRequestsList"}`.
- Two more `[TITLE_UNMAPPED]` names were NOT regressions, just never-synced gaps: `ContentScreen`
  (title `Patterns/Layout/ContentScreen`) has no matching `.tsx` at all — it's a docs-only
  Storybook page (no component export), like `Guidelines`/`DesignLanguage`/`Gallery`. Excluded
  via `cfg.titleMap: {"ContentScreen": null}`. `Badges` (title `Components/DataDisplay/Badges`)
  is a single `.stories.tsx` covering FOUR separate component exports (`ChapterBadge`,
  `PersonBadge`, `RoleBadge`, `CounterBadge`) under one story title with per-story names
  (`Chapter`/`Person`/`Role`/`OnImage`/`Counter`) that don't match any single export — `titleMap`
  only supports a 1:1 title→export mapping, so this can't be synced without either the story
  file being split (one title per exported component — app source change, out of scope for a
  sync) or a custom pairing override. Excluded via `cfg.titleMap: {"Badges": null}` for now;
  revisit if the badges become important design-system surface.
- CreateBaulModal and CreateChapterModal (both new this sync — the standardized-modal-actions
  refactor) hit `[GRID_OVERFLOW]` — `position:fixed`/portal content escaping their grid cells,
  same class as every other `BottomSheetModal`-based modal. Fixed with the standard
  `cfg.overrides.<Name>: {"cardMode": "single", "primaryStory": "Default"}`.
- [GENERAL] **`ModalActions` (`flex flex-wrap-reverse` + `[&>button]:flex-1 min-w-max`) is
  sensitive to a hairline flex-wrap threshold that can differ between the real storybook capture
  and our compiled preview capture even at identical viewport width** — confirmed on
  `NuevoRecuerdoModal`'s `Default` story: real storybook renders `Cancelar`/`Añadir` side by
  side, our preview renders them stacked (via the container's `flex-wrap-reverse`, which visibly
  reverses row order when wrapped — that's why the STACKED preview shows the second button on
  top). Root cause is almost certainly a font-metric/readiness difference between the two
  chromium capture passes right at the two-button combined min-width boundary — NOT a
  cfg/component bug (confirmed container width identical via raw PNGs). Graded `close`, not
  `mismatch` — not fixable via `cardMode`/`viewport` without misrepresenting the component's real
  responsive behavior. **Any ModalActions-based modal with two short-ish button labels is a
  candidate for this same borderline wrap flip** — if a future sync sees an unexplained
  stacked-vs-inline `ModalActions` mismatch, check this bullet before treating it as a real
  regression.
- New stories added mid-development that owned previews needed updating for: `BatchOperationProgress`
  gained `ThumbStates` (icon states not covered by `InProgress`/`AllSucceeded`), `Toast` gained
  `Error` (from the "show error styling for failure toasts" fix). Both just needed one more
  `export const <Name> = sized(compose(S, "<Name>"));` line added to the existing owned preview —
  no new pattern, just the reminder that owned previews don't auto-grow when a story is added to
  an already-owned component's `.stories.tsx`.

- **2026-08-13: `Screens/*` permanently excluded from sync, per explicit user request** (only
  `Components`, `Patterns`, `Layouts`, `Features` should sync going forward — user's stated goal
  is faster syncs). Set `cfg.titleMap: null` for all 17 `Screens/*` leaf names as of this date:
  `Loading`, `RequestDeletion`, `AiChat`, `Carousel`, `Invitacion`, `InvitePreview`, `Welcome`,
  `RemovalRequests`, `MiPerfil`, `NotificationPreferences`, `ClaimPersona`, `ShareTarget`, `Form`,
  `Help`, `Confirmation`, `UploadError`, `Uploading`. Also dropped the now-unused `Empty` →
  `EmptyBaulesScreen` and `PersonaDetail` → `PersonaDetailScreen` titleMap entries — no live
  story currently pairs with either name (see the orphan note below). **Do not re-add any
  `Screens/*` title to `titleMap` on a future re-sync** without first checking with the user —
  this exclusion is deliberate, not a gap to "fix".
- **Pre-existing remote orphans found while auditing the above (2026-08-13), left untouched —
  out of scope for this change, flagged for a separate decision**: the live project has 8
  components with NO matching source anywhere in the repo (`EmptyBaulesScreen`, `OnboardingScreen`,
  `PersonaDetailScreen`, `MiSuscripcionScreen`, `PlanSelectionScreen`, `PaymentPlaceholderScreen`,
  `PlanLimitModal`, `ChapterSelector`) — presumably removed/renamed source over several past
  syncs without the remote ever being reconciled (no anchor tracked them as `removed` because the
  anchor mechanism was only added/trusted more recently, or a re-sync skipped an atomic delete
  pass). None of the 6 `*Screen`-suffixed ones would be excluded by today's `Screens/*` titleMap
  change anyway (their titles no longer exist to match). If the user wants a full stale-orphan
  cleanup, that's a separate, broader task than this one.

## Re-sync risks

- **`entry.ts` staleness is the #1 risk on every future re-sync** — see the `[GENERAL]` bullet
  above. It will not error, it will just silently under-sync. Run the diff script at the start
  of every re-sync, before trusting the driver's component count.
- ChapterCard/PersonaCard's `viewport` overrides were sized to the stories present as of
  2026-07-29 (977px / 918px measured + margin). If either component's card grows a taller
  variant later (extra badges, longer captions), the same clipping will reappear — check raw
  PNG heights before assuming a new mismatch is real.
- SimpleFAB's `skip` list is pinned to specific story ids (currently
  `components-actions-fab--expandable`, `components-actions-fab--three-actions`, as of the
  2026-07-30 revert back to generic names — see the `[GENERAL]` gotcha above). If the FAB
  stories are renamed AGAIN (this has now happened twice), these ids will silently stop matching
  anything (not an error — the skip just becomes a no-op) and the sb-error stories will
  resurface in compare. Re-derive the ids from the storybook build's own `index.json`
  (`ds-bundle/.sb-static/index.json` mid-run, since `cfg.storybookStatic` doesn't currently
  resolve — see the storybookStatic path gotcha above) if FAB.stories.tsx changes again.
- This sync's `--max-stories` cap left several new components partially graded-by-trust:
  PageHeader (6 of 22 stories captured — the rest verified-by-upload only), Hero (6 of 8),
  Notice (6 of 7). All graded stories were clean `match`, so this is low-risk, but if a future
  sync reports a PageHeader regression, consider raising the cap for it given how many
  screen-specific variants it has.
- **2026-07-30 re-sync watch-list**: (1) `cfg.storybookStatic` still points at a location that
  never gets built by this doc's own instructions as written — fix the reference build location
  per the `[GENERAL]` gotcha above on the next sync, or keep paying the ~1min fallback-build tax.
  (2) `AiChat`/`RemovalRequests` titleMap entries depend on those exact title strings
  (`Screens/Chat/AiChat`, `Screens/Photos/RemovalRequests`) — if the storybook taxonomy is
  reclassified again, re-derive from the fresh build's `index.json` rather than assuming the
  titleMap still matches. (3) `NuevoRecuerdoModal`'s `Default` story is graded `close` (not
  `match`) for the ModalActions flex-wrap borderline issue — don't be surprised if a future
  sync's canary spot-check flags it again; re-confirm against fresh screenshots rather than
  assuming regression. (4) `Badges`/`ContentScreen` are deliberately unsynced
  (`titleMap: null`) — if `Badges.stories.tsx` is ever split into one story-file-per-component,
  revisit and sync properly instead of leaving the exclusion in place.
