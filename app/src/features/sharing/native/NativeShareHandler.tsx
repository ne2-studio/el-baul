import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { Capacitor } from '@capacitor/core';
import * as Sentry from '@sentry/react';
import { ShareReceiver, type IncomingShare } from '@/features/sharing/native/shareReceiver';
import { useUIStore } from '@/store/uiStore';
import { loadShare } from '@/features/sharing/useCases';

// Mounted once inside <BrowserRouter> (needs useNavigate). While the user isn't
// authenticated it deliberately does nothing — the native plugin keeps the pending
// share in memory, so this picks it up as soon as auth.isAuthenticated flips to true.
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

    if (auth.isAuthenticated) {
      void ShareReceiver.getPendingShare()
        .then(({ share }) => {
          if (share) void openShare(share);
        })
        .catch((error) => {
          Sentry.captureException(error);
          if (!disposed) showToastMessage('No se pudo comprobar si había una foto compartida pendiente', 'error');
        });
    }

    return () => {
      disposed = true;
      void listenerPromise.then((handle) => handle.remove()).catch((error) => Sentry.captureException(error));
    };
  }, [auth.isAuthenticated, navigate, showToastMessage]);

  return null;
}
