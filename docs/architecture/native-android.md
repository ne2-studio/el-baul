# Native Android (Capacitor)

`app/` ships as three things from one codebase: a browser SPA, an installable PWA
(`vite-plugin-pwa`, `manifest` in `vite.config.ts`), and a native Android app
(`@capacitor/android`, `app/android/`, `capacitor.config.ts`). Capacitor-specific bits are
isolated rather than spread through the app:

- `native/shareReceiver.ts` + `useIncomingShareStore.ts` handle Android's native "share photos
  into El Baúl" intent; `native/NativeShareHandler.tsx` wires the two together (mounted once in
  `App.tsx`).
- `main.tsx` special-cases the OIDC redirect on native: launch-URL deep links are rewritten to
  the in-app `/callback` route, because `react-oidc-context` expects `code`/`state` on the page
  URL, not an OS-level deep link.
- `npm run android:build` (in `app/`) builds with a separate `.env.android` and runs
  `cap sync android`.

See [`deployment.md`](deployment.md) for the Android CI workflow.
