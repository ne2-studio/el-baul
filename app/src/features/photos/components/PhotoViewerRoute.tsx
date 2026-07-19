import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PhotoViewer } from '@/app/components/PhotoViewer';
import { Photo } from '@/app/components/PhotosView';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from 'react-oidc-context';
import { PhotoDate } from '@/types';
import { isAdminRole } from '@/utils/roleUtils';

export const PhotoViewerRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, albumId, photoId } = useParams();
  const auth = useAuth();
  const showToastMessage = useUIStore(state => state.showToastMessage);

  const { baules, albums, photos, recuerdos, loadRecuerdos, addRecuerdo, submitRemovalRequest, setBaulCover, setAlbumCover, movePhotos, deletePhoto, changePhotoDate } = useAppStore();

  const baul = baules.find(b => b.id === baulId);
  const album = albums[baulId!]?.find(a => a.id === albumId);
  const photo = photos[albumId!]?.find(p => p.id === photoId);

  useEffect(() => {
    if (auth.isAuthenticated && photoId) {
      loadRecuerdos(photoId);
    }
  }, [auth.isAuthenticated, photoId, loadRecuerdos]);

  if (!baul || !album || !photo) return <div className="p-8 text-center">Cargando foto...</div>;

  const handleRequestRemoval = async (photo: any, reason: string) => {
    if (!auth.isAuthenticated) return;

    try {
      await submitRemovalRequest(baul.id, photo, reason);
      showToastMessage('Tu solicitud ha sido enviada');
    } catch (error) {
      console.error('Error submitting removal request:', error);
      showToastMessage('Error al enviar la solicitud');
    }
  };

  const handleSetBaulCover = async (photo: any) => {
    if (!auth.isAuthenticated) return;

    try {
      await setBaulCover(baul.id, photo.id);
      showToastMessage('Portada del baúl actualizada');
    } catch (error) {
      console.error('Error setting baul cover:', error);
      showToastMessage('Error al establecer la portada');
    }
  };

  const handleSetAlbumCover = async (photo: any) => {
    if (!auth.isAuthenticated) return;

    try {
      await setAlbumCover(baul.id, album.id, photo.id);
      showToastMessage('Portada del capítulo actualizada');
    } catch (error) {
      console.error('Error setting album cover:', error);
      showToastMessage('Error al establecer la portada');
    }
  };

  const handleAddRecuerdo = async (photoId: string, text: string) => {
    if (!auth.isAuthenticated) return;
    try {
      await addRecuerdo(photoId, text);
    } catch (error) {
      console.error('Error adding recuerdo:', error);
      showToastMessage('Error al añadir el recuerdo');
    }
  };

  const handleMovePhoto = (photoToMove: Photo, targetAlbumId: string) => {
    movePhotos(baul.id, album.id, [photoToMove.id], targetAlbumId)
      .then(() => {
        showToastMessage('Foto movida');
        navigate(`/baules/${baul.id}/albumes/${targetAlbumId}`);
      })
      .catch((error) => {
        console.error('Error moving photo:', error);
        showToastMessage('Error al mover la foto');
      });
  };

  const handleDeletePhoto = (photoToDelete: Photo, reason: string) => {
    deletePhoto(baul.id, album.id, photoToDelete.id, reason)
      .then(() => {
        showToastMessage('La foto ha sido retirada');
        navigate(`/baules/${baul.id}/albumes/${album.id}`);
      })
      .catch((error) => {
        console.error('Error deleting photo:', error);
        showToastMessage('Error al retirar la foto');
      });
  };

  const handleChangeDate = (photoToUpdate: Photo, date: PhotoDate) => {
    changePhotoDate(baul.id, album.id, photoToUpdate.id, date)
      .then(() => showToastMessage('Fecha actualizada'))
      .catch((error) => {
        console.error('Error changing photo date:', error);
        showToastMessage('Error al cambiar la fecha');
      });
  };

  return (
    <PhotoViewer
      photo={photo}
      photos={photos[album.id] || []}
      onClose={() => navigate(`/baules/${baul.id}/albumes/${album.id}`)}
      onPhotoChange={(newPhoto) => navigate(`/baules/${baul.id}/albumes/${album.id}/foto/${newPhoto.id}`)}
      onRequestRemoval={handleRequestRemoval}
      isAdmin={isAdminRole(baul.role)}
      onSetBaulCover={handleSetBaulCover}
      onSetAlbumCover={handleSetAlbumCover}
      onMovePhoto={handleMovePhoto}
      onChangeDate={handleChangeDate}
      onDeletePhoto={handleDeletePhoto}
      allAlbums={albums[baul.id] || []}
      currentAlbum={album}
      recuerdos={recuerdos[photo.id] || []}
      onAddRecuerdo={handleAddRecuerdo}
      onUserClick={(sharedUserId) => navigate(`/baules/${baul.id}/personas/${sharedUserId}`)}
    />
  );
};
