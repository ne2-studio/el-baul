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
- `main.tsx` special-cases the OIDC redirect on native — see [`native-ios.md`](native-ios.md) for
  why this is shared logic rather than an Android-only concern, and for a platform asymmetry in
  the underlying Capacitor plugin that shaped how it's written: `react-oidc-context` expects
  `code`/`state` on `window.location`, which never happens on native (`studio.ne2.elbaul://` isn't
  a page navigation). Instead, `main.tsx` feeds the deep link's URL directly into a `UserManager`
  instance it constructs and hands to `<AuthProvider userManager={...}>`, calling
  `userManager.signinCallback(url)` itself — no navigation, no page reload. Sign-out reuses the
  same deep link as `post_logout_redirect_uri` (no second scheme/intent-filter); since
  `signoutRedirect()` clears the local user before navigating away, the deep-link handler only
  needs to tell the two apart (by whether `code`/`error` is present) to know when there's nothing
  left to do.
- `npm run android:build` (in `app/`) builds with a separate `.env.android` and runs
  `cap sync android`.
- `app/AndroidAppBanner.tsx` (mounted globally in `App.tsx`, gated by
  `Features:AndroidAppBannerEnabled` from `/api/app-config`) offers to open/install the app when
  the *webapp* is loaded from an Android browser. It reuses the existing OIDC callback
  intent-filter (`studio.ne2.elbaul://callback`, see above) as an `intent://` link with
  `S.browser_fallback_url` pointing at Google Play — deliberately, to avoid adding a second
  scheme/host or a verified Android App Link (`assetlinks.json`) just for this. Opening the app
  this way is harmless: `isNativeOidcCallbackUrl` only treats the deep link as a real sign-in
  callback when `code`/`error` is present in the query, which this link never sets.

See [`native-ios.md`](native-ios.md) for the iOS counterpart and [`deployment.md`](deployment.md)
for the Android CI workflow.
