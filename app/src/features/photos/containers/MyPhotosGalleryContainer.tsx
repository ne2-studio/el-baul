import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { Images } from 'lucide-react';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { LoadingSpinner } from '@/design-system/components/feedback/LoadingSpinner';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { PhotoAsset } from '@/types';
import { useMyPhotosStore } from '@/store/useMyPhotosStore';
import { loadMoreMyPhotos, loadMyPhotos } from '@/features/photos/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useLoadMoreSentinel } from '@/hooks/useLoadMoreSentinel';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

const MIS_FOTOS_BASE_PATH = '/mis-fotos';

// Self-sufficient (see the containers/ rule in docs/architecture/frontend.md): "Mis fotos"'s
// own gallery, deliberately the read-only slice of BaulPhotosTabContainer — reuses the same
// PhotoSwimlanes grid/grouping, but with no filter pills, no selection mode, and no upload FAB
// (docs/.backlog issue #62, Slice 1 — those are Slice 2/3). Read the plain useMyPhotosStore
// list directly rather than via ids + usePhotosStore.photosById: unlike Photo, a PhotoAsset
// isn't shared with any other feature yet, so there's nothing to normalize against.
export function MyPhotosGalleryContainer() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const { run, isPending } = useAsyncAction();
  const assets = useMyPhotosStore((state) => state.assets);
  const hasMore = useMyPhotosStore((state) => state.hasMore);
  const [loadFailed, setLoadFailed] = useState(false);

  const fetchFirstPage = useCallback(async () => {
    const result = await run(() => loadMyPhotos(), { key: 'my-photos', errorMessage: 'Error al cargar tus fotos' });
    setLoadFailed(!result.ok);
  }, [run]);

  useEffect(() => {
    if (auth.isAuthenticated && !assets) fetchFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, assets]);

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    run(() => loadMoreMyPhotos(), { key: 'my-photos-more', errorMessage: 'Error al cargar más fotos' });
  }, [hasMore, run]);

  // assets !== undefined como remountKey: el sentinel solo se pinta una vez cargada la primera
  // página — ver useLoadMoreSentinel/BaulPhotosTabContainer.
  const sentinelRef = useLoadMoreSentinel(loadMore, assets !== undefined);

  const handleSelectPhoto = (photo: PhotoAsset) =>
    openPhotoViewer(navigate, location, photoViewerPath(MIS_FOTOS_BASE_PATH, photo.id));

  if (assets === undefined) {
    if (loadFailed) {
      return (
        <ErrorScreen
          title="No se han podido cargar tus fotos"
          message="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={fetchFirstPage}
        />
      );
    }
    return <LoadingSpinner message="Cargando tus fotos..." />;
  }

  if (assets.length === 0) {
    return (
      <EmptyState
        icon={<Images className="w-20 h-20" strokeWidth={1.5} />}
        title="Todavía no tienes fotos aquí"
        subtitle="Las fotos que subas a tus baúles aparecerán aquí"
      />
    );
  }

  return (
    <>
      <PhotoSwimlanes photos={assets} onSelectPhoto={handleSelectPhoto} />
      <div ref={sentinelRef} className="h-1" />
      {isPending('my-photos-more') && <LoadingSpinner size="sm" />}
    </>
  );
}
