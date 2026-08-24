import { useEffect } from 'react';
import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import * as Sentry from '@sentry/react';
import { ShareReceiver } from '@/features/sharing/native/shareReceiver';
import { loadShare } from '@/features/sharing/useCases';
import { useIncomingShareStore } from '@/store/useIncomingShareStore';

type PendingShareCheckStatus = 'idle' | 'checking' | 'done';

interface PendingShareCheckState {
  status: PendingShareCheckStatus;
}

const usePendingShareCheckStore = create<PendingShareCheckState>(() => ({ status: 'idle' }));

let checkPromise: Promise<void> | null = null;

// Runs ShareReceiver.getPendingShare() exactly once per app session, the first time we know the
// user is authenticated — see usePendingShareGate below, which AuthGuards.tsx's PublicRoute/
// ProtectedRoute await before committing to their normal redirect target. Without this, an
// Android share-sheet cold start reliably lost the race: PublicRoute's synchronous redirect to
// "/baules" (based only on auth.isAuthenticated) resolved before this async native check did,
// so the default baúl (and possibly its contribution suggestion) flashed before the app caught
// up and navigated to /compartir. On web/iOS (no ShareReceiver plugin) this resolves immediately
// with nothing pending, so there's no added latency there.
function startPendingShareCheck(): Promise<void> {
  if (checkPromise) return checkPromise;

  usePendingShareCheckStore.setState({ status: 'checking' });

  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('ShareReceiver')) {
    usePendingShareCheckStore.setState({ status: 'done' });
    checkPromise = Promise.resolve();
    return checkPromise;
  }

  checkPromise = ShareReceiver.getPendingShare()
    .then(({ share }) => {
      if (share && share.files.length > 0) return loadShare(share);
      return undefined;
    })
    .catch((error) => {
      Sentry.captureException(error);
    })
    .finally(() => {
      usePendingShareCheckStore.setState({ status: 'done' });
    });

  return checkPromise;
}

// Test-only escape hatch: without this, the module-level singleton would make every test after
// the first see an already-"done" check, regardless of that test's own Capacitor/ShareReceiver
// mocks.
export function __resetPendingShareCheckForTests(): void {
  checkPromise = null;
  usePendingShareCheckStore.setState({ status: 'idle' });
}

// Used by PublicRoute/ProtectedRoute (AuthGuards.tsx). `isChecking` gates rendering while the
// native pending-share check (and, if it finds one, loading it into useIncomingShareStore) is in
// flight; `hasPendingShare` tells the guard to route to /compartir instead of its normal
// destination. Both guards share the same singleton check via the module-level `checkPromise`,
// so it only ever actually calls the native plugin once per app session, no matter how many of
// them mount/remount across navigations.
//
// Deliberately a no-op while unauthenticated: same as before this fix (see the removed poll in
// NativeShareHandler.tsx), there's no point paying for the native round trip before the user can
// even reach /compartir, and ProtectedRoute already sends an unauthenticated user to sign in
// first — the native plugin keeps the pending share in memory regardless, so it's picked up here
// as soon as auth.isAuthenticated flips to true.
export function usePendingShareGate(isAuthenticated: boolean): { isChecking: boolean; hasPendingShare: boolean } {
  const status = usePendingShareCheckStore((state) => state.status);
  const share = useIncomingShareStore((state) => state.share);

  useEffect(() => {
    if (isAuthenticated) void startPendingShareCheck();
  }, [isAuthenticated]);

  if (!isAuthenticated) return { isChecking: false, hasPendingShare: false };

  return { isChecking: status !== 'done', hasPendingShare: status === 'done' && share !== null };
}
