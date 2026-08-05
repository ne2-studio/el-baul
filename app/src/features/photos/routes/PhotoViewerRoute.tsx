import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PhotoViewer } from '@/features/photos/components/PhotoViewer';
import { Recuerdo } from '@/types';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { loadRecuerdos, addRecuerdo, editRecuerdo } from '@/features/memories/useCases';
import { loadPersonas } from '@/features/people/useCases';
import { loadTaggedPersonas, loadChapterPhotos } from '@/features/photos/useCases';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from 'react-oidc-context';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { getBaulPermissions } from '@/utils/roleUtils';
import { api } from '@/api';
import { resolvePhotoRouteContext } from '@/features/photos/uploadFlow';
import { sharePublicLink } from '@/features/sharing/sharePublicLink';
import { closePhotoViewer, getBackgroundLocation, navigateToPhotoInViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

// chapterId is present when viewing a photo inside a real chapter, absent for the virtual
// "Fotos sueltas" chapter (see useBaulesStore's nullable chapterId convention). Real-chapter
// photos are paginated per-chapter and fetched on demand via loadChapterPhotos; loose photos
// are already loaded in full by useBaulScope, so no separate fetch/loading state is needed.
export const PhotoViewerRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, chapterId, photoId } = useParams();
  const auth = useAuth();
  const { run } = useAsyncAction();
  const sharedLinksEnabled = useAppConfigStore(state => state.sharedLinksEnabled);
  const showToastMessage = useUIStore(state => state.showToastMessage);

  const backgroundLocation = getBackgroundLocation(location);

  const { photos: chapterPhotosById } = useBaulesStore();
  const { personas, taggedPersonas } = usePersonasStore();
  const { recuerdos } = useRecuerdosStore();

  const { baul, chapters, loosePhotos, isLoading: isLoadingBaul, refreshFailed, retry } = useBaulScope(baulId);
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

  useEffect(() => {
    if (auth.isAuthenticated && photoId) {
      // Distinct keys — useAsyncAction.run() shares a single default key across calls with
      // no explicit one, so two unkeyed run() calls fired in the same effect flush collide:
      // the second silently short-circuits as "already-pending" instead of actually running.
      run(() => loadRecuerdos(photoId), { key: 'recuerdos', errorMessage: 'No se pudieron cargar los recuerdos' });
      run(() => loadTaggedPersonas(photoId), { key: 'tagged-personas', errorMessage: 'No se pudieron cargar las personas etiquetadas' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, photoId, loadRecuerdos, loadTaggedPersonas]);

  useEffect(() => {
    if (auth.isAuthenticated && baulId && !personas[baulId]) {
      run(() => loadPersonas(baulId), { key: 'personas', errorMessage: 'No se pudieron cargar las personas del baúl' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, baulId, personas, loadPersonas]);

  if (isLoadingBaul) return <div className="p-8 text-center">Cargando foto...</div>;

  if (!baul) {
    if (refreshFailed) {
      return (
        <ErrorScreen
          title="No se ha podido cargar el baúl"
          message="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={retry}
        />
      );
    }
    return <div className="p-8 text-center">No se ha encontrado el baúl.</div>;
  }

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

  const photos = chapterId ? (chapterPhotosById[chapterId] || []) : (loosePhotos || []);
  const photo = photos.find(p => p.id === photoId);
  if (!photo) return <div className="p-8 text-center">No se ha encontrado la foto.</div>;

  const baulPermissions = getBaulPermissions(baul);
  const { currentChapter, basePath, apiChapterId } = resolvePhotoRouteContext({
    baulId: baul.id,
    chapterId,
    chapters: chapters || [],
    loosePhotos: photos,
  });

  const closeViewer = () => closePhotoViewer(navigate, backgroundLocation, basePath);

  const handleAddRecuerdo = async (photoId: string, text: string) => {
    if (!auth.isAuthenticated) return;
    await run(() => addRecuerdo(baul.id, photoId, text), { errorMessage: 'Error al añadir el recuerdo' });
  };

  const handleEditRecuerdo = async (recuerdo: Recuerdo, text: string): Promise<boolean> => {
    if (!auth.isAuthenticated) return false;
    const result = await run(() => editRecuerdo(recuerdo.id, text), {
      successMessage: 'Recuerdo actualizado',
      errorMessage: 'Error al guardar el recuerdo',
    });
    return result.ok;
  };

  const handleShareRecuerdo = async (recuerdo: Recuerdo) => {
    const result = await run(() => api.recuerdos.createShareLink(recuerdo.id), {
      key: 'share-recuerdo',
      errorMessage: 'Error al crear el enlace',
    });
    if (!result.ok) return;

    await sharePublicLink({
      title: `Recuerdo de ${baul.name}`,
      text: `Te comparto un recuerdo de "${baul.name}" en El Baúl.`,
      url: result.value.url,
      onCopied: () => showToastMessage('Enlace copiado al portapapeles'),
    });
  };

  return (
    <PhotoViewer
      photo={photo}
      photos={photos}
      onClose={closeViewer}
      onPhotoChange={(newPhoto) => navigateToPhotoInViewer(navigate, backgroundLocation, photoViewerPath(basePath, newPhoto.id))}
      baulId={baul.id}
      baulName={baul.name}
      isAdmin={baulPermissions.isAdmin}
      sharedLinksEnabled={sharedLinksEnabled}
      baulPersonas={personas[baul.id] || []}
      taggedPersonas={taggedPersonas[photo.id] || []}
      chapter={{
        apiChapterId,
        allChapters: chapters || [],
        currentChapter,
        onMoved: (targetChapterId) => navigate(`/baules/${baul.id}/capitulos/${targetChapterId}`, { replace: true }),
        onDeleted: closeViewer,
      }}
      recuerdos={recuerdos[photo.id] || []}
      onAddRecuerdo={handleAddRecuerdo}
      onUserClick={(personaId) => navigate(`/baules/${baul.id}/personas/${personaId}`)}
      onShareRecuerdo={sharedLinksEnabled ? handleShareRecuerdo : undefined}
      onEditRecuerdo={handleEditRecuerdo}
    />
  );
};
