import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { PhotoViewerContainer } from '@/features/photos/containers/PhotoViewerContainer';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { loadPersonas } from '@/features/people/useCases';
import { loadPhotoBatchPhotos } from '@/features/photos/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { guardBaulScope } from '@/hooks/baulScopeGuard';
import { getBaulPermissions } from '@/utils/roleUtils';
import { closePhotoViewer, getBackgroundLocation, navigateToPhotoInViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

// Gallery scoped to one photo-upload batch — reached either directly from a collage thumbnail
// on the feed card (backgroundLocation is the feed, so closing returns there) or from
// PhotoBatchGridRoute (backgroundLocation is the grid, so closing returns there instead) —
// same overlay mechanism every other photo viewer entry point uses, see
// features/photos/viewerNavigation. Mounts the universal PhotoViewerContainer directly, like
// PersonaPhotoViewerRoute: a batch has no chapter to move photos into or set as cover, so none
// of ChapterPhotoViewerContainer's extras apply here.
export const PhotoBatchViewerRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, batchId, photoId } = useParams();
  const auth = useAuth();
  const { run } = useAsyncAction();

  const backgroundLocation = getBackgroundLocation(location);

  const { photoBatchPhotos } = useBaulesStore();
  const { personas } = usePersonasStore();

  const baulScope = useBaulScope(baulId);

  const [photosFailed, setPhotosFailed] = useState(false);

  const fetchPhotos = async () => {
    if (!baulId || !batchId) return;
    const result = await run(() => loadPhotoBatchPhotos(baulId, batchId), { errorMessage: 'Error al cargar las fotos' });
    setPhotosFailed(!result.ok);
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

  const guard = guardBaulScope(baulScope, { loadingLabel: 'Cargando foto...' });
  if (!guard.ready) return guard.screen;
  const { baul } = guard;

  if (!batchId) return <div className="p-8 text-center">No se ha encontrado la subida.</div>;

  const photos = photoBatchPhotos[batchId];
  if (!photos) {
    if (photosFailed) {
      return (
        <ErrorScreen
          title="No se han podido cargar las fotos"
          message="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={fetchPhotos}
        />
      );
    }
    return <div className="p-8 text-center">Cargando foto...</div>;
  }

  const photo = photos.find((p) => p.id === photoId);
  if (!photo) return <div className="p-8 text-center">No se ha encontrado la foto.</div>;

  const basePath = `/baules/${baul.id}/subida/${batchId}`;
  const baulPermissions = getBaulPermissions(baul);
  const closeViewer = () => closePhotoViewer(navigate, backgroundLocation, basePath);

  return (
    <PhotoViewerContainer
      photo={photo}
      photos={photos}
      baulId={baul.id}
      baulName={baul.name}
      isAdmin={baulPermissions.isAdmin}
      onClose={closeViewer}
      onPhotoChange={(newPhoto) => navigateToPhotoInViewer(navigate, backgroundLocation, photoViewerPath(basePath, newPhoto.id))}
    />
  );
};
