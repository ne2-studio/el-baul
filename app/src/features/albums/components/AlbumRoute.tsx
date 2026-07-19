import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { PhotosView } from '@/app/components/PhotosView';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { SelectedPhoto } from '@/app/components/UploadConfirmationScreen';
import { PhotoDate } from '@/types';

export const AlbumRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, albumId } = useParams();
  const auth = useAuth();
  const {
    baules, albums, photos, albumRecuerdos,
    movePhotos, changePhotoDateBatch, renameAlbum, loadAlbumRecuerdos, addAlbumRecuerdo,
  } = useAppStore();
  const showToastMessage = useUIStore(state => state.showToastMessage);
  const { run } = useAsyncAction();

  const baul = baules.find(b => b.id === baulId);
  const album = albums[baulId!]?.find(a => a.id === albumId);

  useEffect(() => {
    if (auth.isAuthenticated && baulId && albumId) {
      loadAlbumRecuerdos(baulId, albumId);
    }
  }, [auth.isAuthenticated, baulId, albumId, loadAlbumRecuerdos]);

  if (!baul || !album) return <div className="p-8 text-center">Cargando capítulo...</div>;

  const handleAddRecuerdo = (text: string) => {
    addAlbumRecuerdo(baul.id, album.id, text).catch((error) => {
      console.error('Error adding recuerdo:', error);
      showToastMessage('Error al guardar el recuerdo');
    });
  };

  const handleUpdateAlbumInfo = async (name: string, description: string): Promise<boolean> => {
    const result = await run(() => renameAlbum(baul.id, album.id, name, description), {
      successMessage: 'Información del capítulo actualizada',
      errorMessage: 'Error al actualizar la información del capítulo',
    });
    return result.ok;
  };

  const handleBatchMove = async (
    photoIds: string[],
    targetAlbumId: string,
    onItemSettled?: (result: { photoId: string; error?: string }) => void
  ) => {
    const result = await run(() => movePhotos(baul.id, album.id, photoIds, targetAlbumId, onItemSettled), {
      successMessage: `${photoIds.length} ${photoIds.length === 1 ? 'foto movida' : 'fotos movidas'}`,
      errorMessage: 'Algunas fotos no se pudieron mover',
    });
    if (result.ok) navigate(`/baules/${baul.id}/albumes/${targetAlbumId}`);
  };

  const handleBatchChangeDate = async (photoIds: string[], date: PhotoDate): Promise<boolean> => {
    const result = await run(() => changePhotoDateBatch(baul.id, album.id, photoIds, date), {
      successMessage: `Fecha actualizada en ${photoIds.length} ${photoIds.length === 1 ? 'foto' : 'fotos'}`,
      errorMessage: 'Error al cambiar la fecha',
    });
    return result.ok;
  };

  return (
    <PhotosView
      album={album}
      photos={photos[album.id] || []}
      recuerdos={albumRecuerdos[album.id] || []}
      allAlbums={albums[baul.id] || []}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onSelectPhoto={(photo) => navigate(`/baules/${baul.id}/albumes/${album.id}/foto/${photo.id}`)}
      onAddPhotos={(selectedPhotos: SelectedPhoto[]) =>
        navigate(`/baules/${baul.id}/albumes/${album.id}/confirmar`, { state: { selectedPhotos } })
      }
      onPhotosDropped={(count) =>
        showToastMessage(`${count} ${count === 1 ? 'foto no se pudo leer y no se ha añadido' : 'fotos no se pudieron leer y no se han añadido'}`)
      }
      onBatchMove={handleBatchMove}
      onBatchChangeDate={handleBatchChangeDate}
      onUpdateAlbumInfo={handleUpdateAlbumInfo}
      onAddRecuerdo={handleAddRecuerdo}
      onUserClick={(sharedUserId) => navigate(`/baules/${baul.id}/personas/${sharedUserId}`)}
    />
  );
};
