# design-sync NOTES

## Repo-specific gotchas

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
  `compare.mjs` appears to cap viewport height around 2000px.

- `WelcomeScreen.tsx` renders its app icon as `<img src="/pwa-512x512.png">` — an absolute
  site-root path. That's correct and intentional in the real deployed app (Vite serves
  `public/` from the domain root), but incompatible with being embedded as a design-system
  component preview under any other path/domain (our `ds-bundle` doesn't carry `public/`, and
  even if it did, claude.ai/design's real hosting root isn't our bundle's root either). Not a
  bug to fix — editing the real component to satisfy a packaging tool would be overreach for
  something that works correctly in production. Accepted as a known, permanent limitation:
  WelcomeScreen's app-icon renders broken in this preview only. Confirmed isolated (grepped all
  of `src/design-system` and `src/features` for absolute `/`-rooted `img src` — only this one).

## Re-sync risks

(filled in at close-out)
