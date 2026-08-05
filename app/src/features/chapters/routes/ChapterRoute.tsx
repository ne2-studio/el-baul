import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { PhotosView } from '@/features/chapters/components/PhotosView';
import { Photo } from '@/types';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { loadChapterRecuerdos } from '@/features/memories/useCases';
import { loadPersonas } from '@/features/people/useCases';
import { renameChapter, deleteChapter, setChapterCover } from '@/features/chapters/useCases';
import { loadChapterPhotos } from '@/features/photos/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { getBaulPermissions } from '@/utils/roleUtils';
import { api } from '@/api';
import { resolvePhotoRouteContext } from '@/features/photos/uploadFlow';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

interface LocationState {
  // Set by UploadingRoute right after a successful upload — see its comment for why this
  // lives purely in router state instead of a store.
  recentlyUploadedPhotos?: Photo[];
}

// chapterId is present for a real chapter, absent for the virtual "Fotos sueltas" chapter
// (see useBaulesStore's nullable chapterId convention). Real-chapter photos are paginated
// per-chapter and fetched on demand via loadChapterPhotos; loose photos are already loaded
// in full by useBaulScope, so no separate fetch/loading state is needed for them. Chapter-only
// concerns (rename/delete, recuerdos) stay conditional on chapterId being present.
export const ChapterRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { recentlyUploadedPhotos } = (location.state as LocationState) || {};
  const { baulId, chapterId } = useParams();
  const auth = useAuth();
  const { photos } = useBaulesStore();
  // Solo para el badge de recuento del Tabbar — ChapterRecuerdosFeedContainer lee los datos
  // completos él mismo.
  const { chapterRecuerdos } = useRecuerdosStore();
  // La carga sigue aquí (guardia + efecto) porque BatchPhotoActionsContainer asume que ya
  // están cargadas al montar — pero ya no se le pasan como prop a PhotosView.
  const { personas } = usePersonasStore();
  const { run } = useAsyncAction();

  const { baul, chapters, loosePhotos, isLoading: isLoadingBaul, refreshFailed, retry } = useBaulScope(baulId);
  const chapter = chapterId ? chapters?.find(a => a.id === chapterId) : undefined;

  const [photosFailed, setPhotosFailed] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated && baulId && chapterId) {
      loadChapterRecuerdos(baulId, chapterId);
    }
  }, [auth.isAuthenticated, baulId, chapterId]);

  const fetchChapterPhotos = async () => {
    if (!chapterId) return;
    const result = await run(() => loadChapterPhotos(chapterId), { errorMessage: 'Error al cargar las fotos' });
    setPhotosFailed(!result.ok);
  };

  useEffect(() => {
    if (auth.isAuthenticated && chapterId && !photos[chapterId]) {
      fetchChapterPhotos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, chapterId, photos, loadChapterPhotos]);

  useEffect(() => {
    if (auth.isAuthenticated && baulId && !personas[baulId]) {
      // Distinct key — useAsyncAction.run() shares a default key across unkeyed calls, and
      // this effect can fire in the same flush as fetchChapterPhotos' unkeyed one above.
      run(() => loadPersonas(baulId), { key: 'personas', errorMessage: 'No se pudieron cargar las personas del baúl' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, baulId, personas, loadPersonas]);

  if (isLoadingBaul) return <div className="p-8 text-center">Cargando...</div>;

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

  if (chapterId && !photos[chapterId]) {
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
    return <div className="p-8 text-center">Cargando capítulo...</div>;
  }

  const currentPhotos = chapterId ? (photos[chapterId] || []) : (loosePhotos || []);
  const baulPermissions = getBaulPermissions(baul);
  const { currentChapter, basePath, apiChapterId } = resolvePhotoRouteContext({
    baulId: baul.id,
    chapterId,
    chapters: chapters || [],
    loosePhotos: currentPhotos,
  });
  if (!currentChapter) return <div className="p-8 text-center">No se ha encontrado el capítulo.</div>;

  const handleUpdateChapterInfo = async (name: string): Promise<boolean> => {
    if (!chapterId) return false;
    const result = await run(() => renameChapter(baul.id, chapterId, name), {
      successMessage: 'Información del capítulo actualizada',
      errorMessage: 'Error al actualizar la información del capítulo',
    });
    return result.ok;
  };

  const handleSetChapterCover = async (photo: Photo) => {
    if (!chapterId) return;
    await run(() => setChapterCover(baul.id, chapterId, photo.id, photo.thumbnailUrl), {
      successMessage: 'Portada del capítulo actualizada',
      errorMessage: 'Error al establecer la portada',
    });
  };

  const handleDeleteChapter = async (): Promise<boolean> => {
    if (!chapterId) return false;
    const result = await run(() => deleteChapter(baul.id, chapterId), {
      successMessage: 'Capítulo eliminado',
      errorMessage: 'Error al eliminar el capítulo',
    });
    if (result.ok) navigate(`/baules/${baul.id}`);
    return result.ok;
  };

  return (
    <PhotosView
      chapter={currentChapter}
      photos={currentPhotos}
      recentlyAddedPhotos={recentlyUploadedPhotos}
      baulId={baul.id}
      baulName={baul.name}
      chapterId={apiChapterId}
      recuerdosCount={apiChapterId ? (chapterRecuerdos[apiChapterId] || []).length : 0}
      allChapters={chapters || []}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onSelectPhoto={(photo) => openPhotoViewer(navigate, location, photoViewerPath(basePath, photo.id))}
      onUploadPhotos={() => navigate(`${basePath}/confirmar`)}
      onUpdateChapterInfo={chapterId ? handleUpdateChapterInfo : undefined}
      onDeleteChapter={chapterId && baulPermissions.canDeleteChapter ? handleDeleteChapter : undefined}
      onFetchChapterCoverPhotos={chapterId ? (skip, take) => api.photos.getPage(baul.id, { chapterId, skip, take }) : undefined}
      onSetChapterCover={chapterId ? handleSetChapterCover : undefined}
    />
  );
};
