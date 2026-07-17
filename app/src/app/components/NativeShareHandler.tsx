import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { Capacitor } from '@capacitor/core';
import { ShareReceiver, type IncomingShare } from '@/native/shareReceiver';
import { useIncomingShareStore } from '@/store/useIncomingShareStore';

// Mounted once inside <BrowserRouter> (needs useNavigate). While the user isn't
// authenticated it deliberately does nothing — the native plugin keeps the pending
// share in memory, so this picks it up as soon as auth.isAuthenticated flips to true.
export function NativeShareHandler() {
  const navigate = useNavigate();
  const auth = useAuth();
  const loadShare = useIncomingShareStore((state) => state.loadShare);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let disposed = false;

    const openShare = async (share: IncomingShare) => {
      if (disposed || share.files.length === 0) return;
      await loadShare(share);
      if (!disposed) navigate('/compartir');
    };

    const listenerPromise = ShareReceiver.addListener('shareReceived', (share) => {
      if (auth.isAuthenticated) {
        void openShare(share);
      }
    });

    if (auth.isAuthenticated) {
      void ShareReceiver.getPendingShare().then(({ share }) => {
        if (share) void openShare(share);
      });
    }

    return () => {
      disposed = true;
      void listenerPromise.then((handle) => handle.remove());
    };
  }, [auth.isAuthenticated, navigate, loadShare]);

  return null;
}
