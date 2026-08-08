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
import { Photo } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { loadPhotoBatchPhotos } from '@/features/photos/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

// Grid for one photo-upload batch's own photos, reached from its feed card's "y N más" tile —
// same PhotoSwimlanes grid used everywhere else in the app (chapters, fotos sueltas, a
// persona's tagged photos), just scoped to this one batch instead of a chapter/baúl. No Hero
// or Tabbar: a batch has no cover image and no second tab to switch to.
export const PhotoBatchGridRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, batchId } = useParams();
  const auth = useAuth();
  const { photoBatchPhotos } = useBaulesStore();
  const { run } = useAsyncAction();
  const [loadFailed, setLoadFailed] = useState(false);

  const photos = batchId ? photoBatchPhotos[batchId] : undefined;

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

  if (!baulId || !batchId) return <div className="p-8 text-center">No se ha encontrado la subida.</div>;

  const handleBack = () => navigate(`/baules/${baulId}`, { state: { activeTab: 'recuerdos' } });
  const handleSelectPhoto = (photo: Photo) =>
    openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baulId}/subida/${batchId}`, photo.id));

  return (
    <div className="min-h-screen bg-background">
      <PageHeader variant="row" onBack={handleBack} />

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
          <PhotoSwimlanes photos={photos} onSelectPhoto={handleSelectPhoto} />
        )}
      </PageContainer>
    </div>
  );
};
