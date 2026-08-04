import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { PhotosView } from '@/features/chapters/components/PhotosView';
import { Photo, PhotoDate, Recuerdo } from '@/types';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { loadChapterRecuerdos, addChapterRecuerdo, editRecuerdo } from '@/features/memories/useCases';
import { loadPersonas } from '@/features/people/useCases';
import { addTaggedPersonasBatch } from '@/features/chapters/useCases';
import { useUIStore } from '@/store/uiStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { getBaulPermissions } from '@/utils/roleUtils';
import { api } from '@/api';
import { resolvePhotoRouteContext, SelectedPhoto } from '@/features/photos/uploadFlow';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';
import { sharePublicLink } from '@/features/sharing/sharePublicLink';

// chapterId is present for a real chapter, absent for the virtual "Fotos sueltas" chapter
// (see useBaulesStore's nullable chapterId convention). Real-chapter photos are paginated
// per-chapter and fetched on demand via loadChapterPhotos; loose photos are already loaded
// in full by useBaulScope, so no separate fetch/loading state is needed for them. Chapter-only
// concerns (rename/delete, recuerdos) stay conditional on chapterId being present.
export const ChapterRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, chapterId } = useParams();
  const auth = useAuth();
  const {
    photos, loadChapterPhotos,
    movePhotos, changePhotoDateBatch, renameChapter, deleteChapter, createChapter, setChapterCover,
  } = useBaulesStore();
  const { chapterRecuerdos } = useRecuerdosStore();
  const { personas } = usePersonasStore();
  const showToastMessage = useUIStore(state => state.showToastMessage);
  const sharedLinksEnabled = useAppConfigStore(state => state.sharedLinksEnabled);
  const { run } = useAsyncAction();

  const { baul, chapters, loosePhotos, isLoading: isLoadingBaul, refreshFailed, retry } = useBaulScope(baulId);
  const chapter = chapterId ? chapters?.find(a => a.id === chapterId) : undefined;

  const [photosFailed, setPhotosFailed] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated && baulId && chapterId) {
      loadChapterRecuerdos(baulId, chapterId);
    }
  }, [auth.isAuthenticated, baulId, chapterId, loadChapterRecuerdos]);

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

  const handleAddRecuerdo = (text: string) => {
    if (!chapterId) return;
    addChapterRecuerdo(baul.id, chapterId, text).catch((error) => {
      console.error('Error adding recuerdo:', error);
      showToastMessage('Error al guardar el recuerdo', 'error');
    });
  };

  const handleEditRecuerdo = async (recuerdo: Recuerdo, text: string): Promise<boolean> => {
    const result = await run(() => editRecuerdo(recuerdo.id, text), {
      successMessage: 'Recuerdo actualizado',
      errorMessage: 'Error al guardar el recuerdo',
    });
    return result.ok;
  };

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

  const handleBatchMove = async (
    photoIds: string[],
    targetChapterId: string,
    onItemSettled?: (result: { photoId: string; error?: string }) => void
  ) => {
    const result = await run(() => movePhotos(baul.id, apiChapterId, photoIds, targetChapterId, onItemSettled), {
      successMessage: `${photoIds.length} ${photoIds.length === 1 ? 'foto movida' : 'fotos movidas'}`,
      errorMessage: 'Algunas fotos no se pudieron mover',
    });
    if (result.ok) navigate(`/baules/${baul.id}/capitulos/${targetChapterId}`);
  };

  const handleBatchChangeDate = async (photoIds: string[], date: PhotoDate): Promise<boolean> => {
    const result = await run(() => changePhotoDateBatch(baul.id, apiChapterId, photoIds, date), {
      successMessage: `Fecha actualizada en ${photoIds.length} ${photoIds.length === 1 ? 'foto' : 'fotos'}`,
      errorMessage: 'Error al cambiar la fecha',
    });
    return result.ok;
  };

  const handleBatchCreateChapter = async (photoIds: string[], name: string): Promise<boolean> => {
    const result = await run(
      async () => {
        const newChapter = await createChapter(baul.id, name);
        await movePhotos(baul.id, null, photoIds, newChapter.id);
        return newChapter;
      },
      {
        successMessage: `Capítulo "${name}" creado`,
        errorMessage: 'Error al crear el capítulo',
      }
    );
    if (result.ok) navigate(`/baules/${baul.id}/capitulos/${result.value.id}`);
    return result.ok;
  };

  const handleBatchTagPersonas = async (photoIds: string[], personaIds: string[]): Promise<boolean> => {
    const result = await run(() => addTaggedPersonasBatch(baul.id, photoIds, personaIds), {
      successMessage: `${photoIds.length} ${photoIds.length === 1 ? 'foto etiquetada' : 'fotos etiquetadas'}`,
      errorMessage: 'Error al etiquetar las fotos',
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
    <PhotosView
      chapter={currentChapter}
      photos={currentPhotos}
      recuerdos={chapterId ? (chapterRecuerdos[chapterId] || []) : undefined}
      allChapters={chapters || []}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onSelectPhoto={(photo) => openPhotoViewer(navigate, location, photoViewerPath(basePath, photo.id))}
      onAddPhotos={(selectedPhotos: SelectedPhoto[]) =>
        navigate(`${basePath}/confirmar`, { state: { selectedPhotos } })
      }
      onPhotosDropped={(count) =>
        showToastMessage(`${count} ${count === 1 ? 'foto no se pudo leer y no se ha añadido' : 'fotos no se pudieron leer y no se han añadido'}`, 'error')
      }
      onBatchMove={handleBatchMove}
      onBatchChangeDate={handleBatchChangeDate}
      onBatchCreateChapter={chapterId ? undefined : handleBatchCreateChapter}
      personas={personas[baul.id] || []}
      onBatchTagPersonas={handleBatchTagPersonas}
      onUpdateChapterInfo={chapterId ? handleUpdateChapterInfo : undefined}
      onDeleteChapter={chapterId && baulPermissions.canDeleteChapter ? handleDeleteChapter : undefined}
      onFetchChapterCoverPhotos={chapterId ? (skip, take) => api.photos.getPage(baul.id, { chapterId, skip, take }) : undefined}
      onSetChapterCover={chapterId ? handleSetChapterCover : undefined}
      onAddRecuerdo={chapterId ? handleAddRecuerdo : undefined}
      onUserClick={(personaId) => navigate(`/baules/${baul.id}/personas/${personaId}`)}
      onShareRecuerdo={sharedLinksEnabled ? handleShareRecuerdo : undefined}
      onEditRecuerdo={handleEditRecuerdo}
    />
  );
};
