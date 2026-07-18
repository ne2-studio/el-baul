import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PhotosView } from '@/app/components/PhotosView';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
import { SelectedPhoto } from '@/app/components/UploadConfirmationScreen';
import { PhotoDate } from '@/types';

export const AlbumRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, albumId } = useParams();
  const { baules, albums, photos, movePhotos, changePhotoDateBatch, renameAlbum } = useAppStore();
  const showToastMessage = useUIStore(state => state.showToastMessage);

  const baul = baules.find(b => b.id === baulId);
  const album = albums[baulId!]?.find(a => a.id === albumId);

  if (!baul || !album) return <div className="p-8 text-center">Cargando álbum...</div>;

  const canEditAlbum = baul.isCustodio || baul.role === 'colaborador';

  const handleRenameAlbum = (name: string) => {
    renameAlbum(baul.id, album.id, name, album.description)
      .then(() => showToastMessage('Nombre del álbum actualizado'))
      .catch((error) => {
        console.error('Error renaming album:', error);
        showToastMessage('Error al renombrar el álbum');
      });
  };

  const handleUpdateAlbumDescription = (description: string) => {
    renameAlbum(baul.id, album.id, album.name, description)
      .then(() => showToastMessage('Descripción del álbum actualizada'))
      .catch((error) => {
        console.error('Error updating album description:', error);
        showToastMessage('Error al actualizar la descripción');
      });
  };

  const handleBatchMove = (photoIds: string[], targetAlbumId: string) => {
    movePhotos(baul.id, album.id, photoIds, targetAlbumId)
      .then(() => {
        showToastMessage(`${photoIds.length} ${photoIds.length === 1 ? 'foto movida' : 'fotos movidas'}`);
        navigate(`/baules/${baul.id}/albumes/${targetAlbumId}`);
      })
      .catch((error) => {
        console.error('Error moving photos:', error);
        showToastMessage('Error al mover las fotos');
      });
  };

  const handleBatchChangeDate = (photoIds: string[], date: PhotoDate) => {
    changePhotoDateBatch(baul.id, album.id, photoIds, date)
      .then(() => showToastMessage(`Fecha actualizada en ${photoIds.length} ${photoIds.length === 1 ? 'foto' : 'fotos'}`))
      .catch((error) => {
        console.error('Error changing photo dates:', error);
        showToastMessage('Error al cambiar la fecha');
      });
  };

  return (
    <PhotosView
      album={album}
      photos={photos[album.id] || []}
      allAlbums={albums[baul.id] || []}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onSelectPhoto={(photo) => navigate(`/baules/${baul.id}/albumes/${album.id}/foto/${photo.id}`)}
      onAddPhotos={(selectedPhotos: SelectedPhoto[]) =>
        navigate(`/baules/${baul.id}/albumes/${album.id}/confirmar`, { state: { selectedPhotos } })
      }
      onBatchMove={handleBatchMove}
      onBatchChangeDate={handleBatchChangeDate}
      onRenameAlbum={canEditAlbum ? handleRenameAlbum : undefined}
      onUpdateAlbumDescription={canEditAlbum ? handleUpdateAlbumDescription : undefined}
    />
  );
};
