import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { Capacitor } from '@capacitor/core';
import * as Sentry from '@sentry/react';
import { ShareReceiver, type IncomingShare } from '@/native/shareReceiver';
import { useIncomingShareStore } from '@/store/useIncomingShareStore';
import { useUIStore } from '@/store/uiStore';

// Mounted once inside <BrowserRouter> (needs useNavigate). While the user isn't
// authenticated it deliberately does nothing — the native plugin keeps the pending
// share in memory, so this picks it up as soon as auth.isAuthenticated flips to true.
export function NativeShareHandler() {
  const navigate = useNavigate();
  const auth = useAuth();
  const loadShare = useIncomingShareStore((state) => state.loadShare);
  const showToastMessage = useUIStore((state) => state.showToastMessage);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let disposed = false;

    const openShare = async (share: IncomingShare) => {
      if (disposed || share.files.length === 0) return;
      try {
        await loadShare(share);
      } catch (error) {
        Sentry.captureException(error);
        if (!disposed) showToastMessage('No se pudo cargar la foto compartida');
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
          if (!disposed) showToastMessage('No se pudo comprobar si había una foto compartida pendiente');
        });
    }

    return () => {
      disposed = true;
      void listenerPromise.then((handle) => handle.remove()).catch((error) => Sentry.captureException(error));
    };
  }, [auth.isAuthenticated, navigate, loadShare]);

  return null;
}
