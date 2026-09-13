import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { usePostHog } from 'posthog-js/react';
import { Images, Plus } from 'lucide-react';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { LoadingSpinner } from '@/design-system/components/feedback/LoadingSpinner';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { FilterPills } from '@/design-system/components/navigation/FilterPills';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { PhotoAsset } from '@/types';
import { MyPhotosFilter, useMyPhotosStore } from '@/store/useMyPhotosStore';
import { loadMoreMyPhotos, loadMyPhotos } from '@/features/photos/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useLoadMoreSentinel } from '@/hooks/useLoadMoreSentinel';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

const MIS_FOTOS_BASE_PATH = '/mis-fotos';

const FILTER_OPTIONS: { value: MyPhotosFilter; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'sin-compartir', label: 'Sin compartir' },
];

// Self-sufficient (see the containers/ rule in docs/architecture/frontend.md): "Mis fotos"'s
// own gallery, built on the read-only grid from Slice 1 — now with an upload FAB (Slice 3,
// docs/.backlog issue #62) and the "Todas"/"Sin compartir" filter pills. Still no selection
// mode: batch actions over PhotoAsset are out of scope for this slice.
export function MyPhotosGalleryContainer() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const posthog = usePostHog();
  const { run, isPending } = useAsyncAction();
  const assets = useMyPhotosStore((state) => state.assets);
  const hasMore = useMyPhotosStore((state) => state.hasMore);
  const filter = useMyPhotosStore((state) => state.filter);
  const setFilter = useMyPhotosStore((state) => state.setFilter);
  const [loadFailed, setLoadFailed] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { posthog.capture('personal_photos_opened'); }, []);

  const fetchFirstPage = useCallback(async () => {
    const result = await run(() => loadMyPhotos(), { key: 'my-photos', errorMessage: 'Error al cargar tus fotos' });
    setLoadFailed(!result.ok);
  }, [run]);

  useEffect(() => {
    if (auth.isAuthenticated && !assets) fetchFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, assets]);

  const handleFilterChange = (next: MyPhotosFilter) => {
    if (next === filter) return;
    setFilter(next);
    if (next === 'sin-compartir') posthog.capture('personal_photos_unshared_filter_viewed');
  };

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    run(() => loadMoreMyPhotos(), { key: 'my-photos-more', errorMessage: 'Error al cargar más fotos' });
  }, [hasMore, run]);

  // assets !== undefined como remountKey: el sentinel solo se pinta una vez cargada la primera
  // página — ver useLoadMoreSentinel/BaulPhotosTabContainer.
  const sentinelRef = useLoadMoreSentinel(loadMore, assets !== undefined);

  const handleSelectPhoto = (photo: PhotoAsset) =>
    openPhotoViewer(navigate, location, photoViewerPath(MIS_FOTOS_BASE_PATH, photo.id));

  const handleUploadPhotos = () => navigate(`${MIS_FOTOS_BASE_PATH}/subir/confirmar`);

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

  return (
    <>
      <FilterPills options={FILTER_OPTIONS} value={filter} onChange={handleFilterChange} className="mb-4" />

      {assets.length === 0 ? (
        filter === 'sin-compartir' ? (
          <EmptyState
            icon={<Images className="w-20 h-20" strokeWidth={1.5} />}
            title="Todo está compartido"
            subtitle="Ninguna de tus fotos está pendiente de añadir a un baúl."
          />
        ) : (
          <EmptyState
            icon={<Images className="w-20 h-20" strokeWidth={1.5} />}
            title="Tus fotos pueden empezar aquí"
            subtitle="Súbelas ahora y decide más adelante en qué baúl compartirlas."
          />
        )
      ) : (
        <>
          <PhotoSwimlanes photos={assets} onSelectPhoto={handleSelectPhoto} />
          <div ref={sentinelRef} className="h-1" />
          {isPending('my-photos-more') && <LoadingSpinner size="sm" />}
        </>
      )}

      <SimpleFAB label="Subir fotos" icon={<Plus className="w-5 h-5" />} onClick={handleUploadPhotos} />
    </>
  );
}
