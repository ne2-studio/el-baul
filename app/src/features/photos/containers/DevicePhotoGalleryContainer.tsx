import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { usePostHog } from 'posthog-js/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Images, Smartphone } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { LoadingSpinner } from '@/design-system/components/feedback/LoadingSpinner';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { DevicePhoto, isDevicePhotosSupported } from '@/features/photos/native/devicePhotos';
import { useDevicePhotosStore } from '@/store/useDevicePhotosStore';
import { ensureDevicePhotosPermission, loadDevicePhotos, loadMoreDevicePhotos } from '@/features/photos/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useLoadMoreSentinel } from '@/hooks/useLoadMoreSentinel';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

interface DevicePhotoGalleryContainerProps {
  /** Scopes the grid to one MediaStore bucket (see the "carpetas" grid this is opened from).
   * Undefined keeps the original flat, all-photos behavior. */
  albumId?: string;
  /** Selection-mode props mirror MyPhotosGalleryContainer's own shape (GitHub issue #88): the
   * header (icon/counter) and the batch action bar both need this state, so it lives one level
   * up in EnEsteDispositivoAlbumRoute — same reasoning as MisFotosRoute keeping it inline instead
   * of inside this container. Selection is deliberately scoped to whatever's already loaded on
   * screen (this container's own infinite scroll) — no cross-page selection, same as Mis fotos. */
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onLongPress?: (id: string) => void;
}

// Self-sufficient (see the containers/ rule in docs/architecture/frontend.md): "En este
// dispositivo"'s own gallery — a projection of the Android photo library (see this route's own
// boundary note). Deliberately has no filter pills and no upload FAB: neither makes sense for
// assets that don't exist in El Baúl yet (that's the entire point of this being a sibling of
// "Mis fotos", not a filter inside it). Multi-selection (GitHub issue #88) reuses PhotoSwimlanes'
// existing selection primitives, same as MyPhotosGalleryContainer — batching the same two
// single-photo actions the viewer already offered (issues #86/#87), never anything new. Opening
// a photo (DevicePhotoViewerContainer) still allows those same single-photo actions, so this grid
// is no longer strictly read-only end to end, even though the grid itself has no other per-item
// affordances of its own.
export function DevicePhotoGalleryContainer({
  albumId, selectionMode = false, selectedIds, onToggleSelect, onLongPress,
}: DevicePhotoGalleryContainerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const posthog = usePostHog();
  const { run, isPending } = useAsyncAction();
  const permission = useDevicePhotosStore((state) => state.permission);
  const photos = useDevicePhotosStore((state) => state.photos);
  const loadedAlbumId = useDevicePhotosStore((state) => state.loadedAlbumId);
  const hasMore = useDevicePhotosStore((state) => state.hasMore);
  const [loadFailed, setLoadFailed] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { posthog.capture('device_photos_opened'); }, []);

  // `photos` belongs to whichever album's setPage last ran, which can be a previous mount of
  // this same container (e.g. back to the folder grid, then into a different album) — compared
  // against the store's own loadedAlbumId rather than a component-local ref, since a ref resets
  // on every fresh mount and can't tell "stale data from another album" apart from "nothing
  // loaded yet".
  const isCurrentAlbumLoaded = photos !== undefined && loadedAlbumId === albumId;

  const requestAccess = useCallback(async () => {
    const result = await run(() => ensureDevicePhotosPermission(), { key: 'device-photos-permission' });
    setLoadFailed(!result.ok);
  }, [run]);

  const fetchFirstPage = useCallback(async () => {
    const result = await run(() => loadDevicePhotos(albumId), { key: 'device-photos', errorMessage: 'Error al cargar las fotos del dispositivo' });
    setLoadFailed(!result.ok);
  }, [run, albumId]);

  useEffect(() => {
    if (!auth.isAuthenticated || !isDevicePhotosSupported()) return;
    if (permission === 'unknown') requestAccess();
    else if (permission === 'granted' && !isCurrentAlbumLoaded) fetchFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, permission, isCurrentAlbumLoaded]);

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    run(() => loadMoreDevicePhotos(albumId), { key: 'device-photos-more', errorMessage: 'Error al cargar más fotos' });
  }, [hasMore, run, albumId]);

  const sentinelRef = useLoadMoreSentinel(loadMore, isCurrentAlbumLoaded);

  // Same base path this gallery is mounted at (album-scoped from EnEsteDispositivoAlbumRoute
  // today; falls back to the flat list for parity with this container's own albumId? doc above,
  // even though no route currently opens it un-scoped).
  const basePath = albumId ? `/en-este-dispositivo/${albumId}` : '/en-este-dispositivo';
  const handleSelectPhoto = (photo: DevicePhoto) =>
    openPhotoViewer(navigate, location, photoViewerPath(basePath, photo.id));

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

  if (permission !== 'granted' || !isCurrentAlbumLoaded || photos === undefined) {
    if (loadFailed) {
      return (
        <ErrorScreen
          title="No se han podido cargar las fotos"
          message="Comprueba los permisos e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={permission === 'granted' ? fetchFirstPage : requestAccess}
        />
      );
    }
    return <LoadingSpinner message="Cargando fotos del dispositivo..." />;
  }

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={<Images className="w-20 h-20" strokeWidth={1.5} />}
        title="No hay fotos en este dispositivo"
        subtitle="Cuando tengas fotos en tu móvil, aparecerán aquí."
      />
    );
  }

  return (
    <>
      <PhotoSwimlanes<DevicePhoto>
        photos={photos}
        onSelectPhoto={handleSelectPhoto}
        order="desc"
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onLongPress={onLongPress}
      />
      <div ref={sentinelRef} className="h-1" />
      {isPending('device-photos-more') && <LoadingSpinner size="sm" />}
    </>
  );
}
