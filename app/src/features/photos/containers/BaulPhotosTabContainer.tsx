import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { ImageIcon, Plus } from 'lucide-react';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { LoadingSpinner } from '@/design-system/components/feedback/LoadingSpinner';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { Photo } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { hydratePhotos, usePhotosStore } from '@/store/usePhotosStore';
import { loadBaulPhotos, loadMoreBaulPhotos } from '@/features/photos/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useLoadMoreSentinel } from '@/hooks/useLoadMoreSentinel';

interface BaulPhotosTabContainerProps {
  baulId: string;
  // Compartido con BaulRoute: el modo de selección múltiple lo necesitan a la vez el header
  // (icono/contador) y la barra de acciones en lote de BaulRoute, así que vive allí — igual
  // que ChapterRoute mantiene su propio selectionMode inline en vez de en un container — ver
  // la regla de containers/ en docs/architecture/frontend.md.
  selectionMode: boolean;
  selectedIds: Set<string>;
  onSelectPhoto: (photo: Photo) => void;
  onToggleSelect: (id: string) => void;
  onLongPress: (id: string) => void;
  onToggleGroup: (photos: Photo[]) => void;
}

// Self-sufficient tab (owns su propia carga): scroll infinito de TODAS las fotos del baúl —
// todos los capítulos + sueltas — agrupadas por swimlane igual que la vista de fotos de un
// capítulo (PhotoSwimlanes/groupPhotosByYear, orden cronológico ascendente). Pagina contra
// GET /api/baules/{baulId}/photos sin chapterId (ya devuelve todo el baúl, ya ordenado
// server-side — ver PhotoOrdering.OrderByChronology), acumulando en
// useBaulesStore.baulPhotos/baulPhotosHasMore en vez de en estado local, para que
// BaulPhotoViewerRoute (montada como un árbol de rutas aparte, ver
// features/photos/viewerNavigation) pueda leer exactamente lo que esta pestaña ya cargó sin
// duplicar el fetch — mismo patrón que baulFeed/baulFeedHasMore para el feed de recuerdos.
export function BaulPhotosTabContainer({
  baulId, selectionMode, selectedIds, onSelectPhoto, onToggleSelect, onLongPress, onToggleGroup,
}: BaulPhotosTabContainerProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const { run, isPending } = useAsyncAction();
  const { baulPhotos, baulPhotosHasMore } = useBaulesStore();
  const photosById = usePhotosStore((state) => state.photosById);
  const [loadFailed, setLoadFailed] = useState(false);

  const photos = hydratePhotos(baulPhotos[baulId], photosById);
  const hasMore = baulPhotosHasMore[baulId] ?? true;

  const fetchFirstPage = useCallback(async () => {
    const result = await run(() => loadBaulPhotos(baulId), { key: 'baul-photos', errorMessage: 'Error al cargar las fotos' });
    setLoadFailed(!result.ok);
  }, [baulId, run]);

  useEffect(() => {
    if (auth.isAuthenticated && !baulPhotos[baulId]) fetchFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, baulId, baulPhotos]);

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    run(() => loadMoreBaulPhotos(baulId), { key: 'baul-photos-more', errorMessage: 'Error al cargar más fotos' });
  }, [baulId, hasMore, run]);

  // photos !== undefined como remountKey: el sentinel solo se pinta una vez cargada la
  // primera página — ver useLoadMoreSentinel/CoverPhotoPickerModal.
  const sentinelRef = useLoadMoreSentinel(loadMore, photos !== undefined);

  const handleUploadPhotos = () => navigate(`/baules/${baulId}/fotos-sueltas/confirmar`);

  if (photos === undefined) {
    if (loadFailed) {
      return (
        <ErrorScreen
          title="No se han podido cargar las fotos"
          message="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={fetchFirstPage}
        />
      );
    }
    return <LoadingSpinner message="Cargando fotos..." />;
  }

  return (
    <>
      {photos.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="w-20 h-20" strokeWidth={1.5} />}
          title="Todavía no hay fotos aquí"
          subtitle="Sube tus primeras fotos para empezar a llenar este baúl"
        />
      ) : (
        <>
          <PhotoSwimlanes
            photos={photos}
            onSelectPhoto={onSelectPhoto}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onLongPress={onLongPress}
            onToggleGroup={onToggleGroup}
          />
          <div ref={sentinelRef} className="h-1" />
          {isPending('baul-photos-more') && <LoadingSpinner size="sm" />}
        </>
      )}

      <SimpleFAB
        label="Subir fotos"
        icon={<Plus className="w-5 h-5" />}
        onClick={handleUploadPhotos}
        hidden={selectionMode}
      />
    </>
  );
}
