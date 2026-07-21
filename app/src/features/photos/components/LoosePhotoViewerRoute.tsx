import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PhotoViewer } from '@/app/components/PhotoViewer';
import { Photo } from '@/app/components/PhotosView';
import { Album } from '@/app/components/AlbumsView';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from 'react-oidc-context';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { PhotoDate } from '@/types';
import { isAdminRole } from '@/utils/roleUtils';
import { api } from '@/api';
import { saveDownloadedPhoto } from '@/utils/downloadFile';
import { Capacitor } from '@capacitor/core';

export const LoosePhotoViewerRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId, photoId } = useParams();
  const auth = useAuth();
  const { run } = useAsyncAction();

  const { baules, albums, loosePhotos, recuerdos, loadRecuerdos, addRecuerdo, submitRemovalRequest, setBaulCover, movePhotos, deletePhoto, changePhotoDate } = useAppStore();

  const baul = baules.find(b => b.id === baulId);
  const photos = loosePhotos[baulId!] || [];
  const photo = photos.find(p => p.id === photoId);
  const looseAlbum: Album = { id: 'sueltas', name: 'Fotos sueltas', photoCount: photos.length };

  useEffect(() => {
    if (auth.isAuthenticated && photoId) {
      run(() => loadRecuerdos(photoId), { errorMessage: 'No se pudieron cargar los recuerdos' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, photoId, loadRecuerdos]);

  if (!baul || !photo) return <div className="p-8 text-center">Cargando foto...</div>;

  const handleRequestRemoval = async (photo: Photo, reason: string): Promise<boolean> => {
    if (!auth.isAuthenticated) return false;
    const result = await run(() => submitRemovalRequest(baul.id, photo, reason), {
      successMessage: 'Tu solicitud ha sido enviada',
      errorMessage: 'Error al enviar la solicitud',
    });
    return result.ok;
  };

  const handleSetBaulCover = async (photo: Photo) => {
    if (!auth.isAuthenticated) return;
    await run(() => setBaulCover(baul.id, photo.id, photo.thumbnailUrl), {
      successMessage: 'Portada del baúl actualizada',
      errorMessage: 'Error al establecer la portada',
    });
  };

  const handleAddRecuerdo = async (photoId: string, text: string) => {
    if (!auth.isAuthenticated) return;
    await run(() => addRecuerdo(photoId, text), { errorMessage: 'Error al añadir el recuerdo' });
  };

  const handleMovePhoto = async (photoToMove: Photo, targetAlbumId: string): Promise<boolean> => {
    const result = await run(() => movePhotos(baul.id, null, [photoToMove.id], targetAlbumId), {
      successMessage: 'Foto movida',
      errorMessage: 'Error al mover la foto',
    });
    if (result.ok) navigate(`/baules/${baul.id}/albumes/${targetAlbumId}`);
    return result.ok;
  };

  const handleDeletePhoto = async (photoToDelete: Photo, reason: string): Promise<boolean> => {
    const result = await run(() => deletePhoto(baul.id, null, photoToDelete.id, reason), {
      successMessage: 'La foto ha sido retirada',
      errorMessage: 'Error al retirar la foto',
    });
    if (result.ok) navigate(`/baules/${baul.id}/fotos-sueltas`);
    return result.ok;
  };

  const handleChangeDate = async (photoToUpdate: Photo, date: PhotoDate): Promise<boolean> => {
    const result = await run(() => changePhotoDate(baul.id, null, photoToUpdate.id, date), {
      successMessage: 'Fecha actualizada',
      errorMessage: 'Error al cambiar la fecha',
    });
    return result.ok;
  };

  const handleDownloadPhoto = async (photoToDownload: Photo) => {
    await run(async () => {
      const { blob, fileName } = await api.photos.download(photoToDownload.id);
      await saveDownloadedPhoto(blob, fileName);
    }, {
      successMessage: Capacitor.isNativePlatform() ? 'Foto guardada en la galería' : undefined,
      errorMessage: 'Error al descargar la foto',
    });
  };

  return (
    <PhotoViewer
      photo={photo}
      photos={photos}
      onClose={() => navigate(`/baules/${baul.id}/fotos-sueltas`)}
      onPhotoChange={(newPhoto) => navigate(`/baules/${baul.id}/fotos-sueltas/foto/${newPhoto.id}`)}
      onRequestRemoval={handleRequestRemoval}
      isAdmin={isAdminRole(baul.role)}
      onSetBaulCover={handleSetBaulCover}
      onMovePhoto={handleMovePhoto}
      onChangeDate={handleChangeDate}
      onDeletePhoto={handleDeletePhoto}
      allAlbums={albums[baul.id] || []}
      currentAlbum={looseAlbum}
      recuerdos={recuerdos[photo.id] || []}
      onAddRecuerdo={handleAddRecuerdo}
      onUserClick={(sharedUserId) => navigate(`/baules/${baul.id}/personas/${sharedUserId}`)}
      onDownloadPhoto={handleDownloadPhoto}
    />
  );
};
