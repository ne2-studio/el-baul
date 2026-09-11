import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CrossChapterPhotoViewerContainer } from '@/features/chapters/containers/CrossChapterPhotoViewerContainer';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { useBaulScope } from '@/hooks/useBaulScope';
import { guardBaulScope } from '@/hooks/baulScopeGuard';
import { usePersonaScope } from '@/hooks/usePersonaScope';
import { closePhotoViewer, getBackgroundLocation, navigateToPhotoInViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

// Variante de ChapterPhotoViewerRoute que recorre las fotos etiquetadas de una persona
// concreta en vez de las de un capítulo — cruza capítulos libremente, así que en vez de
// ChapterPhotoViewerContainer (scoped a un único capítulo fijo) monta
// CrossChapterPhotoViewerContainer, que resuelve el capítulo de "mover" foto a foto a partir de
// photo.chapterId. Todo lo demás — tag/share/download, portada de baúl, fecha, retirar/
// solicitar retirada, recuerdos — es universal y vive en PhotoViewerContainer, que
// CrossChapterPhotoViewerContainer envuelve.
export const PersonaPhotoViewerRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, personaId, photoId } = useParams();

  const backgroundLocation = getBackgroundLocation(location);

  const baulScope = useBaulScope(baulId);
  const { chapters } = baulScope;

  // Precarga la persona y sus fotos etiquetadas — bloqueando hasta tener ambas — igual que
  // PersonaDetailRoute, para no duplicar aquí la misma lógica de recuperación.
  const { photos: personaPhotos, isLoading: isLoadingPersona, loadFailed: personaPhotosFailed, retry: retryPersona } = usePersonaScope(baulId, personaId);

  const guard = guardBaulScope(
    { ...baulScope, isLoading: baulScope.isLoading || isLoadingPersona },
    { loadingLabel: 'Cargando foto...' },
  );
  if (!guard.ready) return guard.screen;
  const { baul } = guard;

  if (!personaId) return <div className="p-8 text-center">No se ha encontrado la persona.</div>;

  if (!personaPhotos) {
    if (personaPhotosFailed) {
      return (
        <ErrorScreen
          title="No se han podido cargar las fotos"
          message="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={retryPersona}
        />
      );
    }
    return <div className="p-8 text-center">Cargando foto...</div>;
  }

  const photos = personaPhotos;
  const photo = photos.find(p => p.id === photoId);
  if (!photo) return <div className="p-8 text-center">No se ha encontrado la foto.</div>;

  const basePath = `/baules/${baul.id}/personas/${personaId}`;

  const closeViewer = () => closePhotoViewer(navigate, backgroundLocation, basePath);

  // Las fotos de una persona cruzan capítulos libremente (ver comentario de cabecera), así
  // que el nombre del capítulo de cada foto se resuelve aquí cruzando su chapterId contra la
  // lista de capítulos del baúl, ya cargada por useBaulScope.
  const chapterName = photo.chapterId ? chapters?.find((c) => c.id === photo.chapterId)?.name : undefined;

  return (
    <CrossChapterPhotoViewerContainer
      photo={photo}
      photos={photos}
      baulId={baul.id}
      baulName={baul.name}
      allChapters={chapters || []}
      onClose={closeViewer}
      onPhotoChange={(newPhoto) => navigateToPhotoInViewer(navigate, backgroundLocation, photoViewerPath(basePath, newPhoto.id))}
      chapterName={chapterName}
    />
  );
};
