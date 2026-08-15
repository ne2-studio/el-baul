import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { ImageIcon } from 'lucide-react';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { FullScreenLoading } from '@/design-system/components/feedback/FullScreenLoading';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { PhotoSwimlanes } from '@/features/photos/components/PhotoSwimlanes';
import { BatchPhotoActionsContainer } from '@/features/photos/containers/BatchPhotoActionsContainer';
import { Photo } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { hydratePhotos, usePhotosStore } from '@/store/usePhotosStore';
import { loadPhotoBatchPhotos } from '@/features/photos/useCases';
import { loadPersonas } from '@/features/people/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

// Grid for one photo-upload batch's own photos, reached from its feed card's "y N más" tile —
// same PhotoSwimlanes grid used everywhere else in the app (chapters, fotos sueltas, a
// persona's tagged photos), just scoped to this one batch instead of a chapter/baúl. No Hero
// or Tabbar: a batch has no cover image and no second tab to switch to.
//
// Multi-selection state and BatchPhotoActionsContainer mirror ChapterRoute's own — see that
// file's comment for why they stay inline here instead of in a shared container. A batch's
// photos can belong to different chapters (or none), so there's no single "source chapter"
// to pass — chapterId=null, same "fotos sueltas" convention BatchPhotoActionsContainer already
// uses, which also gets us "crear nuevo capítulo" from selected batch photos for free.
// moveableChapters is every real chapter in the baúl (no "current chapter" to exclude here).
export const PhotoBatchGridRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, batchId } = useParams();
  const auth = useAuth();
  const { photoBatchPhotos } = useBaulesStore();
  const { personas } = usePersonasStore();
  const photosById = usePhotosStore((state) => state.photosById);
  const { run } = useAsyncAction();
  const [loadFailed, setLoadFailed] = useState(false);

  const baulScope = useBaulScope(baulId);
  const { chapters } = baulScope;

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setSelectionMode(next.size > 0);
      return next;
    });
  };

  const handleLongPress = (photoId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([photoId]));
  };

  const handleToggleGroup = (groupPhotos: Photo[]) => {
    const groupIds = groupPhotos.map(p => p.id);
    const allSelected = groupIds.length > 0 && groupIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      groupIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
      setSelectionMode(next.size > 0);
      return next;
    });
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const photos = batchId ? hydratePhotos(photoBatchPhotos[batchId], photosById) : undefined;

  const fetchPhotos = async () => {
    if (!baulId || !batchId) return;
    const result = await run(() => loadPhotoBatchPhotos(baulId, batchId), { errorMessage: 'Error al cargar las fotos' });
    setLoadFailed(!result.ok);
  };

  useEffect(() => {
    if (auth.isAuthenticated && baulId && batchId && !photoBatchPhotos[batchId]) {
      fetchPhotos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, baulId, batchId, photoBatchPhotos]);

  useEffect(() => {
    if (auth.isAuthenticated && baulId && !personas[baulId]) {
      run(() => loadPersonas(baulId), { key: 'personas', errorMessage: 'No se pudieron cargar las personas del baúl' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, baulId, personas, loadPersonas]);

  if (!baulId || !batchId) return <div className="p-8 text-center">No se ha encontrado la subida.</div>;

  const handleBack = () => navigate(`/baules/${baulId}`, { state: { activeTab: 'recuerdos' } });
  const handleSelectPhoto = (photo: Photo) =>
    openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baulId}/subida/${batchId}`, photo.id));

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="row"
        onBack={selectionMode ? exitSelection : handleBack}
        backLabel={selectionMode ? 'Cancelar' : 'Volver'}
        trailing={
          selectionMode ? (
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} {selectedIds.size === 1 ? 'seleccionada' : 'seleccionadas'}
            </span>
          ) : undefined
        }
      />

      <PageContainer className="py-6 pb-28">
        {photos === undefined ? (
          loadFailed ? (
            <ErrorScreen
              title="No se han podido cargar las fotos"
              message="Comprueba tu conexión e inténtalo de nuevo."
              actionLabel="Reintentar"
              onAction={fetchPhotos}
            />
          ) : (
            <FullScreenLoading message="Cargando fotos..." />
          )
        ) : photos.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="w-20 h-20" strokeWidth={1.5} />}
            title="No se han encontrado fotos"
            subtitle="Puede que se hayan eliminado desde que se subieron"
          />
        ) : (
          <PhotoSwimlanes
            photos={photos}
            onSelectPhoto={handleSelectPhoto}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onLongPress={handleLongPress}
            onToggleGroup={handleToggleGroup}
          />
        )}
      </PageContainer>

      {baulId && photos && (
        <BatchPhotoActionsContainer
          active={selectionMode}
          baulId={baulId}
          chapterId={null}
          photos={photos}
          selectedIds={selectedIds}
          moveableChapters={chapters || []}
          onDone={exitSelection}
        />
      )}
    </div>
  );
};
