import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PhotoViewer } from '@/app/components/PhotoViewer';
import { Photo } from '@/app/components/PhotosView';
import { Chapter } from '@/app/components/ChaptersView';
import { ErrorScreen } from '@/app/components/ErrorScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useAuth } from 'react-oidc-context';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { PhotoDate } from '@/types';
import { isAdminRole } from '@/utils/roleUtils';
import { api } from '@/api';
import { saveDownloadedPhoto } from '@/utils/downloadFile';
import { Capacitor } from '@capacitor/core';

// chapterId is present when viewing a photo inside a real chapter, absent for the virtual
// "Fotos sueltas" chapter (see useBaulesStore's nullable chapterId convention). Real-chapter
// photos are paginated per-chapter and fetched on demand via loadChapterPhotos; loose photos
// are already loaded in full by useBaulScope, so no separate fetch/loading state is needed.
export const PhotoViewerRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, chapterId, photoId } = useParams();
  const auth = useAuth();
  const { run } = useAsyncAction();

  const backgroundLocation = (location.state as { backgroundLocation?: typeof location } | null)?.backgroundLocation;

  const { photos: chapterPhotosById, loadChapterPhotos, setBaulCover, setChapterCover, movePhotos, deletePhoto, changePhotoDate } = useBaulesStore();
  const { submitRemovalRequest } = usePersonasStore();
  const { recuerdos, loadRecuerdos, addRecuerdo } = useRecuerdosStore();

  const { baul, chapters, loosePhotos, isLoading: isLoadingBaul, refreshFailed, retry } = useBaulScope(baulId);
  const chapter = chapterId ? chapters?.find(a => a.id === chapterId) : undefined;

  const [photosFailed, setPhotosFailed] = useState(false);

  const fetchChapterPhotos = async () => {
    if (!chapterId) return;
    const result = await run(() => loadChapterPhotos(chapterId), { errorMessage: 'Error al cargar las fotos' });
    setPhotosFailed(!result.ok);
  };

  useEffect(() => {
    if (auth.isAuthenticated && chapterId && !chapterPhotosById[chapterId]) {
      fetchChapterPhotos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, chapterId, chapterPhotosById, loadChapterPhotos]);

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

  if (chapterId && !chapter) return <div className="p-8 text-center">No se ha encontrado el capítulo.</div>;

  if (chapterId && !chapterPhotosById[chapterId]) {
    if (photosFailed) {
      return (
        <ErrorScreen
          title="No se han podido cargar las fotos"
          message="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={fetchChapterPhotos}
        />
      );
    }
    return <div className="p-8 text-center">Cargando foto...</div>;
  }

  const photos = chapterId ? (chapterPhotosById[chapterId] || []) : (loosePhotos || []);
  const photo = photos.find(p => p.id === photoId);
  if (!photo) return <div className="p-8 text-center">No se ha encontrado la foto.</div>;

  const currentChapter: Chapter = chapter ?? { id: 'sueltas', name: 'Fotos sueltas', photoCount: photos.length };
  const basePath = chapterId ? `/baules/${baul.id}/capitulos/${chapterId}` : `/baules/${baul.id}/fotos-sueltas`;

  // Si el visor se abrió desde dentro de la app (backgroundLocation presente), un back de
  // navegador vuelve exactamente a esa pantalla en su mismo scroll; si se accedió por enlace
  // directo no hay nada a lo que volver, así que se navega explícitamente al álbum.
  const closeViewer = () => {
    if (backgroundLocation) navigate(-1);
    else navigate(basePath, { replace: true });
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

  const handleSetChapterCover = async (photo: Photo) => {
    if (!auth.isAuthenticated || !chapterId) return;
    await run(() => setChapterCover(baul.id, chapterId, photo.id, photo.thumbnailUrl), {
      successMessage: 'Portada del capítulo actualizada',
      errorMessage: 'Error al establecer la portada',
    });
  };

  const handleAddRecuerdo = async (photoId: string, text: string) => {
    if (!auth.isAuthenticated) return;
    await run(() => addRecuerdo(baul.id, photoId, text), { errorMessage: 'Error al añadir el recuerdo' });
  };

  const handleMovePhoto = async (photoToMove: Photo, targetChapterId: string): Promise<boolean> => {
    const result = await run(() => movePhotos(baul.id, chapterId ?? null, [photoToMove.id], targetChapterId), {
      successMessage: 'Foto movida',
      errorMessage: 'Error al mover la foto',
    });
    if (result.ok) navigate(`/baules/${baul.id}/capitulos/${targetChapterId}`, { replace: true });
    return result.ok;
  };

  const handleDeletePhoto = async (photoToDelete: Photo, reason: string): Promise<boolean> => {
    const result = await run(() => deletePhoto(baul.id, chapterId ?? null, photoToDelete.id, reason), {
      successMessage: 'La foto ha sido retirada',
      errorMessage: 'Error al retirar la foto',
    });
    if (result.ok) closeViewer();
    return result.ok;
  };

  const handleChangeDate = async (photoToUpdate: Photo, date: PhotoDate): Promise<boolean> => {
    const result = await run(() => changePhotoDate(baul.id, chapterId ?? null, photoToUpdate.id, date), {
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
      onClose={closeViewer}
      onPhotoChange={(newPhoto) => navigate(`${basePath}/foto/${newPhoto.id}`, {
        replace: true,
        state: backgroundLocation ? { backgroundLocation } : undefined,
      })}
      onRequestRemoval={handleRequestRemoval}
      isAdmin={isAdminRole(baul.role)}
      onSetBaulCover={handleSetBaulCover}
      onSetChapterCover={chapterId ? handleSetChapterCover : undefined}
      onMovePhoto={handleMovePhoto}
      onChangeDate={handleChangeDate}
      onDeletePhoto={handleDeletePhoto}
      allChapters={chapters || []}
      currentChapter={currentChapter}
      recuerdos={recuerdos[photo.id] || []}
      onAddRecuerdo={handleAddRecuerdo}
      onUserClick={(personaId) => navigate(`/baules/${baul.id}/personas/${personaId}`)}
      onDownloadPhoto={handleDownloadPhoto}
    />
  );
};
