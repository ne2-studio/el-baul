import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { PhotosView } from '@/app/components/PhotosView';
import { ErrorScreen } from '@/app/components/ErrorScreen';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/uiStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { SelectedPhoto } from '@/app/components/UploadConfirmationScreen';
import { PhotoDate } from '@/types';
import { isAdminRole } from '@/utils/roleUtils';

export const AlbumRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId, albumId } = useParams();
  const auth = useAuth();
  const {
    photos, albumRecuerdos, loadAlbumPhotos,
    movePhotos, changePhotoDateBatch, renameAlbum, deleteAlbum, loadAlbumRecuerdos, addAlbumRecuerdo,
  } = useAppStore();
  const showToastMessage = useUIStore(state => state.showToastMessage);
  const { run } = useAsyncAction();

  const { baul, albums, isLoading: isLoadingBaul, refreshFailed, retry } = useBaulScope(baulId);
  const album = albums?.find(a => a.id === albumId);

  const [photosFailed, setPhotosFailed] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated && baulId && albumId) {
      loadAlbumRecuerdos(baulId, albumId);
    }
  }, [auth.isAuthenticated, baulId, albumId, loadAlbumRecuerdos]);

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

  if (isLoadingBaul) return <div className="p-8 text-center">Cargando...</div>;

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
    return <div className="p-8 text-center">Cargando capítulo...</div>;
  }

  const handleAddRecuerdo = (text: string) => {
    addAlbumRecuerdo(baul.id, album.id, text).catch((error) => {
      console.error('Error adding recuerdo:', error);
      showToastMessage('Error al guardar el recuerdo');
    });
  };

  const handleUpdateAlbumInfo = async (name: string): Promise<boolean> => {
    const result = await run(() => renameAlbum(baul.id, album.id, name), {
      successMessage: 'Información del capítulo actualizada',
      errorMessage: 'Error al actualizar la información del capítulo',
    });
    return result.ok;
  };

  const handleDeleteAlbum = async (): Promise<boolean> => {
    const result = await run(() => deleteAlbum(baul.id, album.id), {
      successMessage: 'Capítulo eliminado',
      errorMessage: 'Error al eliminar el capítulo',
    });
    if (result.ok) navigate(`/baules/${baul.id}`);
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
      allAlbums={albums || []}
      onBack={() => navigate(`/baules/${baul.id}`)}
      onSelectPhoto={(photo) => navigate(`/baules/${baul.id}/albumes/${album.id}/foto/${photo.id}`, { state: { backgroundLocation: location } })}
      onAddPhotos={(selectedPhotos: SelectedPhoto[]) =>
        navigate(`/baules/${baul.id}/albumes/${album.id}/confirmar`, { state: { selectedPhotos } })
      }
      onPhotosDropped={(count) =>
        showToastMessage(`${count} ${count === 1 ? 'foto no se pudo leer y no se ha añadido' : 'fotos no se pudieron leer y no se han añadido'}`)
      }
      onBatchMove={handleBatchMove}
      onBatchChangeDate={handleBatchChangeDate}
      onUpdateAlbumInfo={handleUpdateAlbumInfo}
      onDeleteAlbum={isAdminRole(baul.role) ? handleDeleteAlbum : undefined}
      onAddRecuerdo={handleAddRecuerdo}
      onUserClick={(sharedUserId) => navigate(`/baules/${baul.id}/personas/${sharedUserId}`)}
    />
  );
};
