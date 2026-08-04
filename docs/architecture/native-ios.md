# Native iOS (Capacitor)

`app/` ships the same SPA as a native iOS app via `@capacitor/ios`, `app/ios/`, and
`capacitor.config.ts` — see [`native-android.md`](native-android.md) for the shared rationale of
keeping Capacitor-specific code with the feature it serves instead of a shared `native/` bucket.
Building/running the iOS shell requires Xcode, so it can only be done on a Mac; there's no
device/simulator CI for it yet (unlike `android-ci.yml`, see [`deployment.md`](deployment.md)) —
verify iOS changes manually on a Mac before merging.

- **Deep link registration**: `app/ios/App/App/Info.plist`'s `CFBundleURLTypes` registers the
  `studio.ne2.elbaul` scheme (the iOS equivalent of `AndroidManifest.xml`'s intent-filter).
  `app/ios/App/App/AppDelegate.swift`'s `application(_:open:options:)` forwards the open-URL event
  to `ApplicationDelegateProxy.shared`, which is what lets Capacitor's `App` plugin see it.
- **OIDC callback handling** is shared, platform-uniform logic in `main.tsx` — see
  [`native-android.md`](native-android.md) for what it does and why. It was originally written
  and only validated against Android's plugin behavior, though, and one asymmetry in
  `@capacitor/app` is worth knowing before touching that code:

  - Android's `Bridge` captures `intentUri` **once**, from the activity's original launch
    `Intent`, and never updates it on a later `onNewIntent()` — so `CapacitorApp.getLaunchUrl()`
    essentially never re-returns a deep link that arrived while the app was already running; that
    case is delivered exactly once, via the `appUrlOpen` listener.
  - iOS's `AppPlugin.getLaunchUrl()` returns `ApplicationDelegateProxy.shared.lastURL`, which is
    set on **every** `application(_:open:)` call and is **never cleared** by the plugin. It keeps
    returning the same URL for the rest of the process's lifetime, including from a deep link
    that's already been consumed.

  `main.tsx`'s deep-link handler is written to tolerate this: it never navigates or reloads the
  page in response to a deep link (it feeds the URL straight into a `UserManager` instance
  instead), so re-delivering an already-consumed callback URL just fails `signinCallback` quietly
  instead of repeating whatever reaction consuming it once had. This matters concretely: an
  earlier version of this handler rewrote native callbacks into a `window.location.replace(...)`
  to the in-app `/callback` route, which — combined with iOS never clearing `lastURL` — reloaded
  the page, re-read the same stale launch URL, and rewrote+reloaded again, forever. That's why the
  handler no longer navigates at all on native.
- `npm run ios:build` (in `app/`) builds with a separate `.env.ios` and runs `cap sync ios`.

See [`native-android.md`](native-android.md) for the Android counterpart.
