import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PhotosView } from '@/app/components/PhotosView';
import { Album } from '@/app/components/AlbumsView';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
import { SelectedPhoto } from '@/app/components/UploadConfirmationScreen';

export const LoosePhotosRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const { baules, albums, loosePhotos, movePhotos } = useAppStore();
  const showToastMessage = useUIStore(state => state.showToastMessage);

  const baul = baules.find(b => b.id === baulId);

  if (!baul) return <div className="p-8 text-center">Cargando...</div>;

  const photos = loosePhotos[baul.id] || [];
  const looseAlbum: Album = {
    id: 'sueltas',
    name: 'Fotos sueltas',
    description: 'Fotos que aún no pertenecen a ningún álbum',
    photoCount: photos.length,
    coverPhotoUrl: photos[0]?.thumbnailUrl,
  };

  const handleBatchMove = (photoIds: string[], targetAlbumId: string) => {
    movePhotos(baul.id, null, photoIds, targetAlbumId)
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
      album={looseAlbum}
      photos={photos}
      allAlbums={albums[baul.id] || []}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onSelectPhoto={(photo) => navigate(`/baules/${baul.id}/fotos-sueltas/foto/${photo.id}`)}
      onAddPhotos={(selectedPhotos: SelectedPhoto[]) =>
        navigate(`/baules/${baul.id}/fotos-sueltas/confirmar`, { state: { selectedPhotos } })
      }
      onBatchMove={handleBatchMove}
    />
  );
};
