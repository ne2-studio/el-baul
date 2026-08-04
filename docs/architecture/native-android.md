# Native Android (Capacitor)

`app/` ships as three things from one codebase: a browser SPA, an installable PWA
(`vite-plugin-pwa`, `manifest` in `vite.config.ts`), and a native Android app
(`@capacitor/android`, `app/android/`, `capacitor.config.ts`). Capacitor-specific code lives with
the feature it serves rather than in a shared `native/` bucket — a plugin bridge is only as
generic as its one caller, so grouping by platform instead of by feature bought nothing besides
an extra folder to check. If a second native integration shows up with its own plugin, that's the
trigger to reconsider a shared home for plugin *bridges* specifically (not for the business logic
that calls them) — not before:

- `features/sharing/native/shareReceiver.ts` + `useIncomingShareStore.ts` handle Android's native
  "share photos into El Baúl" intent; `features/sharing/native/NativeShareHandler.tsx` wires the
  two together (mounted once in `App.tsx`). The orchestration itself (`loadShare`/`clear`) lives
  in `features/sharing/useCases`, per [`frontend.md`](frontend.md)'s use-case layer.
- `main.tsx` special-cases the OIDC redirect on native: launch-URL deep links are rewritten to
  the in-app `/callback` route, because `react-oidc-context` expects `code`/`state` on the page
  URL, not an OS-level deep link. Sign-out reuses the same deep link as `post_logout_redirect_uri`
  (no second scheme/intent-filter) — `CallbackRoute` tells the two apart by whether `code` is
  present in the query string.
- `npm run android:build` (in `app/`) builds with a separate `.env.android` and runs
  `cap sync android`.

See [`deployment.md`](deployment.md) for the Android CI workflow.
