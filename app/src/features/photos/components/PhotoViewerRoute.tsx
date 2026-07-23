import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PhotoViewer } from '@/app/components/PhotoViewer';
import { Photo } from '@/app/components/PhotosView';
import { ErrorScreen } from '@/app/components/ErrorScreen';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from 'react-oidc-context';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { PhotoDate } from '@/types';
import { isAdminRole } from '@/utils/roleUtils';
import { api } from '@/api';
import { saveDownloadedPhoto } from '@/utils/downloadFile';
import { Capacitor } from '@capacitor/core';

export const PhotoViewerRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, albumId, photoId } = useParams();
  const auth = useAuth();
  const { run } = useAsyncAction();

  const backgroundLocation = (location.state as { backgroundLocation?: typeof location } | null)?.backgroundLocation;

  const { photos, recuerdos, loadRecuerdos, loadAlbumPhotos, addRecuerdo, submitRemovalRequest, setBaulCover, setAlbumCover, movePhotos, deletePhoto, changePhotoDate } = useAppStore();

  const { baul, albums, isLoading: isLoadingBaul, refreshFailed, retry } = useBaulScope(baulId);
  const album = albums?.find(a => a.id === albumId);

  const [photosFailed, setPhotosFailed] = useState(false);

  const fetchAlbumPhotos = async () => {
    if (!albumId) return;
    const result = await run(() => loadAlbumPhotos(albumId), { errorMessage: 'Error al cargar las fotos' });
    setPhotosFailed(!result.ok);
  };

  useEffect(() => {
    if (auth.isAuthenticated && albumId && !photos[albumId]) {
      fetchAlbumPhotos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, albumId, photos, loadAlbumPhotos]);

  useEffect(() => {
    if (auth.isAuthenticated && photoId) {
      run(() => loadRecuerdos(photoId), { errorMessage: 'No se pudieron cargar los recuerdos' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, photoId, loadRecuerdos]);

  if (isLoadingBaul) return <div className="p-8 text-center">Cargando foto...</div>;

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

  if (!album) return <div className="p-8 text-center">No se ha encontrado el capítulo.</div>;

  if (!photos[albumId!]) {
    if (photosFailed) {
      return (
        <ErrorScreen
          title="No se han podido cargar las fotos"
          message="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={fetchAlbumPhotos}
        />
      );
    }
    return <div className="p-8 text-center">Cargando foto...</div>;
  }

  const photo = photos[albumId!]?.find(p => p.id === photoId);
  if (!photo) return <div className="p-8 text-center">No se ha encontrado la foto.</div>;

  // Si el visor se abrió desde dentro de la app (backgroundLocation presente), un back de
  // navegador vuelve exactamente a esa pantalla en su mismo scroll; si se accedió por enlace
  // directo no hay nada a lo que volver, así que se navega explícitamente al álbum.
  const closeViewer = () => {
    if (backgroundLocation) navigate(-1);
    else navigate(`/baules/${baul.id}/albumes/${album.id}`, { replace: true });
  };

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

  const handleSetAlbumCover = async (photo: Photo) => {
    if (!auth.isAuthenticated) return;
    await run(() => setAlbumCover(baul.id, album.id, photo.id, photo.thumbnailUrl), {
      successMessage: 'Portada del capítulo actualizada',
      errorMessage: 'Error al establecer la portada',
    });
  };

  const handleAddRecuerdo = async (photoId: string, text: string) => {
    if (!auth.isAuthenticated) return;
    await run(() => addRecuerdo(baul.id, photoId, text), { errorMessage: 'Error al añadir el recuerdo' });
  };

  const handleMovePhoto = async (photoToMove: Photo, targetAlbumId: string): Promise<boolean> => {
    const result = await run(() => movePhotos(baul.id, album.id, [photoToMove.id], targetAlbumId), {
      successMessage: 'Foto movida',
      errorMessage: 'Error al mover la foto',
    });
    if (result.ok) navigate(`/baules/${baul.id}/albumes/${targetAlbumId}`, { replace: true });
    return result.ok;
  };

  const handleDeletePhoto = async (photoToDelete: Photo, reason: string): Promise<boolean> => {
    const result = await run(() => deletePhoto(baul.id, album.id, photoToDelete.id, reason), {
      successMessage: 'La foto ha sido retirada',
      errorMessage: 'Error al retirar la foto',
    });
    if (result.ok) closeViewer();
    return result.ok;
  };

  const handleChangeDate = async (photoToUpdate: Photo, date: PhotoDate): Promise<boolean> => {
    const result = await run(() => changePhotoDate(baul.id, album.id, photoToUpdate.id, date), {
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
      photos={photos[album.id] || []}
      onClose={closeViewer}
      onPhotoChange={(newPhoto) => navigate(`/baules/${baul.id}/albumes/${album.id}/foto/${newPhoto.id}`, {
        replace: true,
        state: backgroundLocation ? { backgroundLocation } : undefined,
      })}
      onRequestRemoval={handleRequestRemoval}
      isAdmin={isAdminRole(baul.role)}
      onSetBaulCover={handleSetBaulCover}
      onSetAlbumCover={handleSetAlbumCover}
      onMovePhoto={handleMovePhoto}
      onChangeDate={handleChangeDate}
      onDeletePhoto={handleDeletePhoto}
      allAlbums={albums || []}
      currentAlbum={album}
      recuerdos={recuerdos[photo.id] || []}
      onAddRecuerdo={handleAddRecuerdo}
      onUserClick={(sharedUserId) => navigate(`/baules/${baul.id}/personas/${sharedUserId}`)}
      onDownloadPhoto={handleDownloadPhoto}
    />
  );
};
