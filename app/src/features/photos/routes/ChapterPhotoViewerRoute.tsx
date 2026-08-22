import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChapterPhotoViewerContainer } from '@/features/chapters/containers/ChapterPhotoViewerContainer';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { hydratePhotos, usePhotosStore } from '@/store/usePhotosStore';
import { loadChapterPhotos } from '@/features/photos/useCases';
import { useAuth } from 'react-oidc-context';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { guardBaulScope } from '@/hooks/baulScopeGuard';
import { resolvePhotoRouteContext } from '@/features/photos/uploadFlow';
import { closePhotoViewer, getBackgroundLocation, navigateToPhotoInViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

// chapterId is present when viewing a photo inside a real chapter, absent for the virtual
// "Fotos sueltas" chapter (see useBaulesStore's nullable chapterId convention). Real-chapter
// photos are paginated per-chapter and fetched on demand via loadChapterPhotos; loose photos
// are already loaded in full by useBaulScope, so no separate fetch/loading state is needed.
//
// Solo hace el wiring específico a "qué fotos se muestran" (fotos de este capítulo, o
// sueltas) — decide qué opciones adicionales hay (mover, portada de capítulo) delegando en
// ChapterPhotoViewerContainer, y todo lo demás (recuerdos, etiquetado, tag/share/download,
// borrado, portada de baúl, fecha) vive en PhotoViewerContainer, universal a ambos visores.
export const ChapterPhotoViewerRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, chapterId, photoId } = useParams();
  const auth = useAuth();
  const { run } = useAsyncAction();

  const backgroundLocation = getBackgroundLocation(location);

  const { photos: chapterPhotosById } = useBaulesStore();
  const photosById = usePhotosStore((state) => state.photosById);

  const baulScope = useBaulScope(baulId);
  const { chapters, loosePhotos } = baulScope;
  const chapter = chapterId ? chapters?.find(a => a.id === chapterId) : undefined;

  const [photosFailed, setPhotosFailed] = useState(false);

  const fetchChapterPhotos = async () => {
    if (!chapterId) return;
    const result = await run(() => loadChapterPhotos(chapterId), { errorMessage: 'Error al cargar las fotos' });
    setPhotosFailed(!result.ok);
  };

  useEffect(() => {
    if (auth.isAuthenticated && chapterId && !chapterPhotosById[chapterId]) {
      fetchChapterPhotos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, chapterId, chapterPhotosById, loadChapterPhotos]);

  const guard = guardBaulScope(baulScope, { loadingLabel: 'Cargando foto...' });
  if (!guard.ready) return guard.screen;
  const { baul } = guard;

  if (chapterId && !chapter) return <div className="p-8 text-center">No se ha encontrado el capítulo.</div>;

  if (chapterId && !chapterPhotosById[chapterId]) {
    if (photosFailed) {
      return (
        <ErrorScreen
          title="No se han podido cargar las fotos"
          message="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={fetchChapterPhotos}
        />
      );
    }
    return <div className="p-8 text-center">Cargando foto...</div>;
  }

  const photos = chapterId ? (hydratePhotos(chapterPhotosById[chapterId], photosById) || []) : (loosePhotos || []);
  const photo = photos.find(p => p.id === photoId);
  if (!photo) return <div className="p-8 text-center">No se ha encontrado la foto.</div>;

  const { currentChapter, basePath, apiChapterId } = resolvePhotoRouteContext({
    baulId: baul.id,
    chapterId,
    chapters: chapters || [],
    loosePhotos: photos,
  });

  const closeViewer = () => closePhotoViewer(navigate, backgroundLocation, basePath);

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
      chapterName={currentChapter?.name}
      hideChapterBadge={!!chapterId}
    />
  );
};
