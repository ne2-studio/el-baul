import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PhotoViewer } from '@/app/components/PhotoViewer';
import { Photo } from '@/app/components/PhotosView';
import { Album } from '@/app/components/AlbumsView';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from 'react-oidc-context';
import { PhotoDate } from '@/types';

export const LoosePhotoViewerRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, photoId } = useParams();
  const auth = useAuth();
  const showToastMessage = useUIStore(state => state.showToastMessage);

  const { baules, albums, loosePhotos, recuerdos, loadRecuerdos, addRecuerdo, submitRemovalRequest, setBaulCover, movePhotos, deletePhoto, changePhotoDate } = useAppStore();

  const baul = baules.find(b => b.id === baulId);
  const photos = loosePhotos[baulId!] || [];
  const photo = photos.find(p => p.id === photoId);
  const looseAlbum: Album = { id: 'sueltas', name: 'Fotos sueltas', photoCount: photos.length };

  useEffect(() => {
    if (auth.isAuthenticated && photoId) {
      loadRecuerdos(photoId);
    }
  }, [auth.isAuthenticated, photoId, loadRecuerdos]);

  if (!baul || !photo) return <div className="p-8 text-center">Cargando foto...</div>;

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
    movePhotos(baul.id, null, [photoToMove.id], targetAlbumId)
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
    deletePhoto(baul.id, null, photoToDelete.id, reason)
      .then(() => {
        showToastMessage('La foto ha sido retirada');
        navigate(`/baules/${baul.id}/fotos-sueltas`);
      })
      .catch((error) => {
        console.error('Error deleting photo:', error);
        showToastMessage('Error al retirar la foto');
      });
  };

  const handleChangeDate = (photoToUpdate: Photo, date: PhotoDate) => {
    changePhotoDate(baul.id, null, photoToUpdate.id, date)
      .then(() => showToastMessage('Fecha actualizada'))
      .catch((error) => {
        console.error('Error changing photo date:', error);
        showToastMessage('Error al cambiar la fecha');
      });
  };

  return (
    <PhotoViewer
      photo={photo}
      photos={photos}
      onClose={() => navigate(`/baules/${baul.id}/fotos-sueltas`)}
      onPhotoChange={(newPhoto) => navigate(`/baules/${baul.id}/fotos-sueltas/foto/${newPhoto.id}`)}
      onRequestRemoval={handleRequestRemoval}
      isCustodio={baul.isCustodio}
      onSetBaulCover={handleSetBaulCover}
      onMovePhoto={handleMovePhoto}
      onChangeDate={handleChangeDate}
      onDeletePhoto={handleDeletePhoto}
      allAlbums={albums[baul.id] || []}
      currentAlbum={looseAlbum}
      recuerdos={recuerdos[photo.id] || []}
      onAddRecuerdo={handleAddRecuerdo}
    />
  );
};
