import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { usePostHog } from 'posthog-js/react';
import { FolderOpen, Smartphone } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { LoadingSpinner } from '@/design-system/components/feedback/LoadingSpinner';
import { DeviceAlbumCard } from '@/features/photos/components/DeviceAlbumCard';
import { isDevicePhotosSupported } from '@/features/photos/native/devicePhotos';
import { useDevicePhotosStore } from '@/store/useDevicePhotosStore';
import { useDeviceAlbumsStore } from '@/store/useDeviceAlbumsStore';
import { ensureDevicePhotosPermission, loadDeviceAlbums } from '@/features/photos/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';

interface DeviceAlbumsGalleryContainerProps {
  onSelectAlbum: (albumId: string) => void;
}

// "Carpetas primero" landing for "En este dispositivo" (see EnEsteDispositivoRoute's boundary
// note) — mirrors DevicePhotoGalleryContainer's permission/loading states, but for the album
// grid instead of the flat photo list; opening a card hands off to that same container, scoped
// to one albumId.
export function DeviceAlbumsGalleryContainer({ onSelectAlbum }: DeviceAlbumsGalleryContainerProps) {
  const auth = useAuth();
  const posthog = usePostHog();
  const { run, isPending } = useAsyncAction();
  const permission = useDevicePhotosStore((state) => state.permission);
  const albums = useDeviceAlbumsStore((state) => state.albums);
  const [loadFailed, setLoadFailed] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { posthog.capture('device_albums_opened'); }, []);

  const requestAccess = useCallback(async () => {
    const result = await run(() => ensureDevicePhotosPermission(), { key: 'device-albums-permission' });
    setLoadFailed(!result.ok);
  }, [run]);

  const fetchAlbums = useCallback(async () => {
    const result = await run(() => loadDeviceAlbums(), { key: 'device-albums', errorMessage: 'Error al cargar las carpetas del dispositivo' });
    setLoadFailed(!result.ok);
  }, [run]);

  useEffect(() => {
    if (!auth.isAuthenticated || !isDevicePhotosSupported()) return;
    if (permission === 'unknown') requestAccess();
    else if (permission === 'granted' && !albums) fetchAlbums();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, permission, albums]);

  if (!isDevicePhotosSupported()) {
    return (
      <EmptyState
        icon={<Smartphone className="w-20 h-20" strokeWidth={1.5} />}
        title="Solo disponible en la app de Android"
        subtitle="Instala El Baúl en tu móvil Android para ver aquí las fotos de tu dispositivo."
      />
    );
  }

  if (permission === 'denied') {
    return (
      <div className="text-center">
        <EmptyState
          icon={<Smartphone className="w-20 h-20" strokeWidth={1.5} />}
          title="Sin acceso a tus fotos"
          subtitle="El Baúl necesita permiso para ver las fotos de este dispositivo. Concédelo desde los ajustes de la app."
        />
        <Button variant="plain" onClick={requestAccess} className="text-primary font-medium">
          Reintentar
        </Button>
      </div>
    );
  }

  if (isPending('device-albums-permission') || permission !== 'granted' || albums === undefined) {
    if (loadFailed) {
      return (
        <ErrorScreen
          title="No se han podido cargar las carpetas"
          message="Comprueba los permisos e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={permission === 'granted' ? fetchAlbums : requestAccess}
        />
      );
    }
    return <LoadingSpinner message="Cargando carpetas del dispositivo..." />;
  }

  if (albums.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen className="w-20 h-20" strokeWidth={1.5} />}
        title="No hay fotos en este dispositivo"
        subtitle="Cuando tengas fotos en tu móvil, aparecerán aquí."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {albums.map((album) => (
        <DeviceAlbumCard key={album.albumId} album={album} onClick={() => onSelectAlbum(album.albumId)} />
      ))}
    </div>
  );
}
