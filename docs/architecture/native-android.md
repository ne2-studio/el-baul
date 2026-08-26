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
  "share photos into El Baúl" intent; `features/sharing/native/incomingShareController.ts` (its
  `useIncomingShareController` hook, mounted once in `App.tsx` via the `IncomingShareController`
  component) is the single point that learns about an incoming share, whether the app was already
  running (`shareReceived` event) or not (`getPendingShare()`). It re-polls `getPendingShare()` on
  every native `resume` (`@capacitor/app`'s `App.addListener('resume', ...)`), not just once per
  session: the native side (`ShareReceiverPlugin.java`) keeps the pending share in memory until
  `clearPendingShare()` is called, so re-asking on every resume is what makes this robust against
  `onNewIntent` firing before React/OIDC finish rehydrating — the previous design (a `getPendingShare()`
  poll memoized for the whole session, gated on `auth.isAuthenticated` at the exact instant the
  poll or the live event fired) could silently drop a share in that window with nothing left to
  retry. Receiving a share is deliberately not auth-gated (it only touches an in-memory store);
  only the redirect to `/compartir` needs auth, and that's a single render-time check in `App.tsx`
  next to `backgroundLocation` (`pendingShare && auth.isAuthenticated && pathname !== '/compartir'`)
  rather than logic duplicated inside `ProtectedRoute`/`PublicRoute` — it re-asserts itself on
  every render, so it can't be raced/overwritten by some other screen's own navigation the way an
  imperative one-shot `navigate()` could. The orchestration itself (`loadShare`/`clear`) lives in
  `features/sharing/useCases`, per [`frontend.md`](frontend.md)'s use-case layer.
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
  scheme/host just for this. Opening the app this way is harmless: `isNativeOidcCallbackUrl` only
  treats the deep link as a real sign-in callback when `code`/`error` is present in the query,
  which this link never sets.
- `features/profile/native/PushNotificationsBanner.tsx` (mounted globally in `App.tsx`, right
  next to `AndroidAppBanner`) is that banner's mirror image: it offers to enable native push
  notifications, and only makes sense *inside* the native Android app (gated by
  `isPushNotificationsSupported()`, i.e. never in the webapp) and only while this device hasn't
  enabled them yet (`useAuthStore.pushNotificationsEnabled` — the same flag that gates the push
  toggle in `NotificationPreferencesRoute`). Same visual shell and same dismiss-cooldown pattern
  as `AndroidAppBanner` (`pushNotificationsBannerUtils.ts`), but a one-week cooldown instead of a
  one-day one, and deliberately still `localStorage` rather than anything synced to the
  account/backend or a persistent native store: the whole point is that it resets on
  uninstall/reinstall or on a new device, so each install gets asked once.
- Email links (`TrackedLinkBuilder` in the API) *do* need a verified Android App Link, since they
  arrive as a plain `https://` URL in someone's inbox, never through this app's own UI: a second
  `intent-filter` in `AndroidManifest.xml`, `android:autoVerify="true"` on the app's own domain
  (`app-prod.el-baul.ne2.studio` — the one `TrackedLinkBuilder.BuildRedirectUrl` already redirects
  a tracked link's 302 to, not the API's tracking domain; Android verifies App Links against the
  URL a browser navigates *to*, including after a redirect, not just the one first tapped, so one
  verified domain covers the whole email-click round trip with no change needed on the API side).
  Verification needs `app/public/.well-known/assetlinks.json` served from that domain with the
  release signing certificate's SHA-256 fingerprint (`keytool -list -v -keystore
  app/android/el-baul-release.jks -alias <ANDROID_KEY_ALIAS>`, password/alias in the
  `ANDROID_KEYSTORE_PASSWORD`/`ANDROID_KEY_ALIAS` CI secrets — see `android-beta.yml`; if a
  different release key is ever cut, that fingerprint has to be updated too) — without a matching
  fingerprint there, Android just fails verification silently and falls back to opening the link
  in the browser. On the JS side, `main.tsx` doesn't reuse
  `isNativeOidcCallbackUrl` for these: `isNativeAppLinkUrl` (`nativeOidcCallback.ts`) recognizes
  any `http(s)` URL delivered via `appUrlOpen`/`getLaunchUrl` — safe to do without checking the
  host again, since Android only ever hands back the one domain declared above — and feeds its
  `pathname`+`search` to `window.location.assign`, which the WebView interprets as a normal
  in-app navigation to `/?redirectTo=...` (the same query param `AuthGuards.tsx` already reads on
  the web flow).

See [`native-ios.md`](native-ios.md) for the iOS counterpart and [`deployment.md`](deployment.md)
for the Android CI workflow.
