import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { PhotosView } from '@/app/components/PhotosView';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
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

  const handleUpdateAlbumInfo = (name: string, description: string) => {
    renameAlbum(baul.id, album.id, name, description)
      .then(() => showToastMessage('Información del capítulo actualizada'))
      .catch((error) => {
        console.error('Error updating album info:', error);
        showToastMessage('Error al actualizar la información del capítulo');
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
      recuerdos={albumRecuerdos[album.id] || []}
      allAlbums={albums[baul.id] || []}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onSelectPhoto={(photo) => navigate(`/baules/${baul.id}/albumes/${album.id}/foto/${photo.id}`)}
      onAddPhotos={(selectedPhotos: SelectedPhoto[]) =>
        navigate(`/baules/${baul.id}/albumes/${album.id}/confirmar`, { state: { selectedPhotos } })
      }
      onBatchMove={handleBatchMove}
      onBatchChangeDate={handleBatchChangeDate}
      onUpdateAlbumInfo={handleUpdateAlbumInfo}
      onAddRecuerdo={handleAddRecuerdo}
      onUserClick={(sharedUserId) => navigate(`/baules/${baul.id}/personas/${sharedUserId}`)}
    />
  );
};
