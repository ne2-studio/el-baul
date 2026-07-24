import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { PhotosView } from '@/app/components/PhotosView';
import { ErrorScreen } from '@/app/components/ErrorScreen';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { SelectedPhoto } from '@/app/components/UploadConfirmationScreen';
import { PhotoDate } from '@/types';
import { isAdminRole } from '@/utils/roleUtils';

export const ChapterRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, chapterId } = useParams();
  const auth = useAuth();
  const {
    photos, chapterRecuerdos, loadChapterPhotos,
    movePhotos, changePhotoDateBatch, renameChapter, deleteChapter, loadChapterRecuerdos, addChapterRecuerdo,
  } = useAppStore();
  const showToastMessage = useUIStore(state => state.showToastMessage);
  const { run } = useAsyncAction();

  const { baul, chapters, isLoading: isLoadingBaul, refreshFailed, retry } = useBaulScope(baulId);
  const chapter = chapters?.find(a => a.id === chapterId);

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

  if (!chapter) return <div className="p-8 text-center">No se ha encontrado el capítulo.</div>;

  if (!photos[chapterId!]) {
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

  const handleAddRecuerdo = (text: string) => {
    addChapterRecuerdo(baul.id, chapter.id, text).catch((error) => {
      console.error('Error adding recuerdo:', error);
      showToastMessage('Error al guardar el recuerdo');
    });
  };

  const handleUpdateChapterInfo = async (name: string): Promise<boolean> => {
    const result = await run(() => renameChapter(baul.id, chapter.id, name), {
      successMessage: 'Información del capítulo actualizada',
      errorMessage: 'Error al actualizar la información del capítulo',
    });
    return result.ok;
  };

  const handleDeleteChapter = async (): Promise<boolean> => {
    const result = await run(() => deleteChapter(baul.id, chapter.id), {
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
    const result = await run(() => movePhotos(baul.id, chapter.id, photoIds, targetChapterId, onItemSettled), {
      successMessage: `${photoIds.length} ${photoIds.length === 1 ? 'foto movida' : 'fotos movidas'}`,
      errorMessage: 'Algunas fotos no se pudieron mover',
    });
    if (result.ok) navigate(`/baules/${baul.id}/capitulos/${targetChapterId}`);
  };

  const handleBatchChangeDate = async (photoIds: string[], date: PhotoDate): Promise<boolean> => {
    const result = await run(() => changePhotoDateBatch(baul.id, chapter.id, photoIds, date), {
      successMessage: `Fecha actualizada en ${photoIds.length} ${photoIds.length === 1 ? 'foto' : 'fotos'}`,
      errorMessage: 'Error al cambiar la fecha',
    });
    return result.ok;
  };

  return (
    <PhotosView
      chapter={chapter}
      photos={photos[chapter.id] || []}
      recuerdos={chapterRecuerdos[chapter.id] || []}
      allChapters={chapters || []}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onSelectPhoto={(photo) => navigate(`/baules/${baul.id}/capitulos/${chapter.id}/foto/${photo.id}`, { state: { backgroundLocation: location } })}
      onAddPhotos={(selectedPhotos: SelectedPhoto[]) =>
        navigate(`/baules/${baul.id}/capitulos/${chapter.id}/confirmar`, { state: { selectedPhotos } })
      }
      onPhotosDropped={(count) =>
        showToastMessage(`${count} ${count === 1 ? 'foto no se pudo leer y no se ha añadido' : 'fotos no se pudieron leer y no se han añadido'}`)
      }
      onBatchMove={handleBatchMove}
      onBatchChangeDate={handleBatchChangeDate}
      onUpdateChapterInfo={handleUpdateChapterInfo}
      onDeleteChapter={isAdminRole(baul.role) ? handleDeleteChapter : undefined}
      onAddRecuerdo={handleAddRecuerdo}
      onUserClick={(personaId) => navigate(`/baules/${baul.id}/personas/${personaId}`)}
    />
  );
};
