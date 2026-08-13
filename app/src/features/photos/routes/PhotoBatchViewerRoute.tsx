import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { ChapterPhotoViewerContainer } from '@/features/chapters/containers/ChapterPhotoViewerContainer';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { hydratePhotos, usePhotosStore } from '@/store/usePhotosStore';
import { loadPersonas } from '@/features/people/useCases';
import { loadPhotoBatchPhotos } from '@/features/photos/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { guardBaulScope } from '@/hooks/baulScopeGuard';
import { closePhotoViewer, getBackgroundLocation, navigateToPhotoInViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

// Gallery scoped to one photo-upload batch — reached either directly from a collage thumbnail
// on the feed card (backgroundLocation is the feed, so closing returns there) or from
// PhotoBatchGridRoute (backgroundLocation is the grid, so closing returns there instead) —
// same overlay mechanism every other photo viewer entry point uses, see
// features/photos/viewerNavigation. Mounts ChapterPhotoViewerContainer like
// ChapterPhotoViewerRoute does: a batch's photos do belong to a chapter (Photo.chapterId,
// same field every other photo carries) even though the route itself is scoped by batchId
// rather than chapterId, so "mover a otro capítulo" applies here too — derived per-photo
// since a batch's own chapterId isn't otherwise available on this route.
export const PhotoBatchViewerRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, batchId, photoId } = useParams();
  const auth = useAuth();
  const { run } = useAsyncAction();

  const backgroundLocation = getBackgroundLocation(location);

  const { photoBatchPhotos } = useBaulesStore();
  const { personas } = usePersonasStore();
  const photosById = usePhotosStore((state) => state.photosById);

  const baulScope = useBaulScope(baulId);
  const { chapters } = baulScope;

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

  const photos = hydratePhotos(photoBatchPhotos[batchId], photosById);
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
  const closeViewer = () => closePhotoViewer(navigate, backgroundLocation, basePath);

  // null (no undefined) por el mismo contrato que apiChapterId en el resto de visores: "fotos
  // sueltas" es un scope de mover válido, solo que sin portada de capítulo.
  const apiChapterId = photo.chapterId ?? null;
  const currentChapter = apiChapterId ? chapters?.find((c) => c.id === apiChapterId) : undefined;

  return (
    <ChapterPhotoViewerContainer
      photo={photo}
      photos={photos}
      baulId={baul.id}
      baulName={baul.name}
      apiChapterId={apiChapterId}
      allChapters={chapters || []}
      currentChapter={currentChapter}
      onClose={closeViewer}
      onPhotoChange={(newPhoto) => navigateToPhotoInViewer(navigate, backgroundLocation, photoViewerPath(basePath, newPhoto.id))}
    />
  );
};
