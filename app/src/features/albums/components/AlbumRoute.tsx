import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PhotosView } from '@/app/components/PhotosView';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
import { SelectedPhoto } from '@/app/components/UploadConfirmationScreen';

export const AlbumRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, albumId } = useParams();
  const { baules, albums, photos, movePhotos } = useAppStore();
  const showToastMessage = useUIStore(state => state.showToastMessage);

  const baul = baules.find(b => b.id === baulId);
  const album = albums[baulId!]?.find(a => a.id === albumId);

  if (!baul || !album) return <div className="p-8 text-center">Cargando álbum...</div>;

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
    />
  );
};
