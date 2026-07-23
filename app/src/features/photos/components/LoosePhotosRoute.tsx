import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PhotosView } from '@/app/components/PhotosView';
import { Album } from '@/app/components/AlbumsView';
import { ErrorScreen } from '@/app/components/ErrorScreen';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { SelectedPhoto } from '@/app/components/UploadConfirmationScreen';
import { PhotoDate } from '@/types';

export const LoosePhotosRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId } = useParams();
  const { movePhotos, changePhotoDateBatch, createAlbum } = useAppStore();
  const showToastMessage = useUIStore(state => state.showToastMessage);
  const { run } = useAsyncAction();

  const { baul, albums, loosePhotos, isLoading, refreshFailed, retry } = useBaulScope(baulId);

  if (isLoading) return <div className="p-8 text-center">Cargando...</div>;

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

  const photos = loosePhotos || [];
  const looseAlbum: Album = {
    id: 'sueltas',
    name: 'Fotos sueltas',
    photoCount: photos.length,
    coverPhotoUrl: photos[0]?.thumbnailUrl,
  };

  const handleBatchMove = async (
    photoIds: string[],
    targetAlbumId: string,
    onItemSettled?: (result: { photoId: string; error?: string }) => void
  ) => {
    const result = await run(() => movePhotos(baul.id, null, photoIds, targetAlbumId, onItemSettled), {
      successMessage: `${photoIds.length} ${photoIds.length === 1 ? 'foto movida' : 'fotos movidas'}`,
      errorMessage: 'Algunas fotos no se pudieron mover',
    });
    if (result.ok) navigate(`/baules/${baul.id}/albumes/${targetAlbumId}`);
  };

  const handleBatchChangeDate = async (photoIds: string[], date: PhotoDate): Promise<boolean> => {
    const result = await run(() => changePhotoDateBatch(baul.id, null, photoIds, date), {
      successMessage: `Fecha actualizada en ${photoIds.length} ${photoIds.length === 1 ? 'foto' : 'fotos'}`,
      errorMessage: 'Error al cambiar la fecha',
    });
    return result.ok;
  };

  const handleBatchCreateChapter = async (photoIds: string[], name: string): Promise<boolean> => {
    const result = await run(
      async () => {
        const album = await createAlbum(baul.id, name);
        await movePhotos(baul.id, null, photoIds, album.id);
        return album;
      },
      {
        successMessage: `Capítulo "${name}" creado`,
        errorMessage: 'Error al crear el capítulo',
      }
    );
    if (result.ok) navigate(`/baules/${baul.id}/albumes/${result.value.id}`);
    return result.ok;
  };

  return (
    <PhotosView
      album={looseAlbum}
      photos={photos}
      allAlbums={albums || []}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onSelectPhoto={(photo) => navigate(`/baules/${baul.id}/fotos-sueltas/foto/${photo.id}`, { state: { backgroundLocation: location } })}
      onAddPhotos={(selectedPhotos: SelectedPhoto[]) =>
        navigate(`/baules/${baul.id}/fotos-sueltas/confirmar`, { state: { selectedPhotos } })
      }
      onPhotosDropped={(count) =>
        showToastMessage(`${count} ${count === 1 ? 'foto no se pudo leer y no se ha añadido' : 'fotos no se pudieron leer y no se han añadido'}`)
      }
      onBatchMove={handleBatchMove}
      onBatchChangeDate={handleBatchChangeDate}
      onBatchCreateChapter={handleBatchCreateChapter}
    />
  );
};
