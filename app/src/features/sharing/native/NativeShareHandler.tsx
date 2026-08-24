import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { Capacitor } from '@capacitor/core';
import * as Sentry from '@sentry/react';
import { ShareReceiver, type IncomingShare } from '@/features/sharing/native/shareReceiver';
import { useUIStore } from '@/store/uiStore';
import { loadShare } from '@/features/sharing/useCases';

// Mounted once inside <BrowserRouter> (needs useNavigate). Only handles a share arriving while
// the app is already running (the 'shareReceived' event) — a share already pending at launch is
// instead picked up by AuthGuards.tsx's usePendingShareGate (see pendingShareGate.ts), ahead of
// PublicRoute/ProtectedRoute committing to their normal redirect target. That used to be this
// component's job too (an on-mount getPendingShare() poll, gated the same way on
// auth.isAuthenticated), but running it here raced PublicRoute's synchronous authenticated
// redirect on an Android share-sheet cold start and reliably lost: the default baúl flashed
// before this component's async check caught up and navigated to /compartir.
export function NativeShareHandler() {
  const navigate = useNavigate();
  const auth = useAuth();
  const showToastMessage = useUIStore((state) => state.showToastMessage);

  useEffect(() => {
    // ShareReceiver solo tiene implementación nativa en Android (ver
    // docs/architecture/native-android.md) — en iOS el plugin no está registrado, así que
    // llamarlo rechazaría con un error de "no implementado" en cuanto el usuario se autentica.
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('ShareReceiver')) return;

    let disposed = false;

    const openShare = async (share: IncomingShare) => {
      if (disposed || share.files.length === 0) return;
      try {
        await loadShare(share);
      } catch (error) {
        Sentry.captureException(error);
        if (!disposed) showToastMessage('No se pudo cargar la foto compartida', 'error');
        return;
      }
      if (!disposed) navigate('/compartir');
    };

    const listenerPromise = ShareReceiver.addListener('shareReceived', (share) => {
      if (auth.isAuthenticated) {
        void openShare(share);
      }
    });

    return () => {
      disposed = true;
      void listenerPromise.then((handle) => handle.remove()).catch((error) => Sentry.captureException(error));
    };
  }, [auth.isAuthenticated, navigate, showToastMessage]);

  return null;
}
