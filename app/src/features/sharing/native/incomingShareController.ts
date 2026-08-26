import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import * as Sentry from '@sentry/react';
import { ShareReceiver, type IncomingShare } from '@/features/sharing/native/shareReceiver';
import { loadShare } from '@/features/sharing/useCases';
import { useIncomingShareStore } from '@/store/useIncomingShareStore';

// Single intake point for Android's native "share photos into El Baúl" intent. Replaces the old
// pair of NativeShareHandler (hot 'shareReceived' listener, auth-gated with no retry) +
// pendingShareGate (a getPendingShare() poll memoized once per JS session, invoked from inside
// AuthGuards.tsx's route guards). That split had a real gap: onNewIntent (native) can fire before
// React/react-oidc-context finish rehydrating on resume, so a share arriving in that window was
// dropped by the listener's auth check, and nothing ever re-asked the native side because the
// poll only ever runs once. The native plugin already keeps `pendingShare` in memory until
// explicitly cleared (see ShareReceiverPlugin.java), so the fix is to keep asking it — on every
// resume, not just once — instead of relying on a single race-prone snapshot.
//
// Deliberately no auth gate here: storing a share in useIncomingShareStore is harmless before
// sign-in finishes. Only navigating to /compartir needs auth, and that's App.tsx's job (see the
// forced-redirect check next to backgroundLocation there) — RequireAuth already sends an
// unauthenticated user to sign in first, carrying redirectTo.
function receiveShare(share: IncomingShare | undefined): void {
  if (!share || share.files.length === 0) return;

  // Idempotent by shareId: getPendingShare() gets re-polled on every resume, so without this a
  // share that's already loaded (and still pending selection) would call loadShare() again on
  // every subsequent resume while the user is looking at the selector.
  if (useIncomingShareStore.getState().share?.shareId === share.shareId) return;

  loadShare(share).catch((error) => Sentry.captureException(error));
}

async function pollPendingShare(): Promise<void> {
  try {
    const { share } = await ShareReceiver.getPendingShare();
    receiveShare(share);
  } catch (error) {
    Sentry.captureException(error);
  }
}

// Known Chromium/WebView-on-Android compositing bug: a DOM change that lands right around resume
// (e.g. the /compartir redirect below, but not only that — any route can be affected) sometimes
// doesn't get composited to the screen until the next real scroll/touch event. A 1px scroll nudge
// forces a genuine repaint without any visible jump.
function nudgeRepaint(): void {
  requestAnimationFrame(() => {
    window.scrollBy(0, 1);
    requestAnimationFrame(() => window.scrollBy(0, -1));
  });
}

// Mounted once in App.tsx. Keeps the native 'shareReceived' listener alive for the whole app
// session (covers a share arriving while already in the foreground) and re-polls
// getPendingShare() on mount and on every native resume (covers cold start and the
// background→foreground gap described above).
export function useIncomingShareController(): void {
  useEffect(() => {
    // ShareReceiver solo tiene implementación nativa en Android (ver
    // docs/architecture/native-android.md) — en iOS/web el plugin no está registrado.
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('ShareReceiver')) return;

    const listenerPromise = ShareReceiver.addListener('shareReceived', receiveShare);
    const resumeListenerPromise = CapacitorApp.addListener('resume', () => {
      nudgeRepaint();
      void pollPendingShare();
    });

    void pollPendingShare();

    return () => {
      void listenerPromise.then((handle) => handle.remove()).catch((error) => Sentry.captureException(error));
      void resumeListenerPromise.then((handle) => handle.remove()).catch((error) => Sentry.captureException(error));
    };
  }, []);
}

// Mountable component form, for symmetry with the other globally-mounted handlers in App.tsx.
export function IncomingShareController(): null {
  useIncomingShareController();
  return null;
}
