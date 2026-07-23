import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PhotosView } from '@/app/components/PhotosView';
import { Album } from '@/app/components/AlbumsView';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { SelectedPhoto } from '@/app/components/UploadConfirmationScreen';
import { PhotoDate } from '@/types';

export const LoosePhotosRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const { baules, albums, loosePhotos, movePhotos, changePhotoDateBatch, createAlbum } = useAppStore();
  const showToastMessage = useUIStore(state => state.showToastMessage);
  const { run } = useAsyncAction();

  const baul = baules.find(b => b.id === baulId);

  if (!baul) return <div className="p-8 text-center">Cargando...</div>;

  const photos = loosePhotos[baul.id] || [];
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
      allAlbums={albums[baul.id] || []}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onSelectPhoto={(photo) => navigate(`/baules/${baul.id}/fotos-sueltas/foto/${photo.id}`)}
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
