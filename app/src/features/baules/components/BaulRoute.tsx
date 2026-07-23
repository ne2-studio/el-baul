import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AlbumsView } from '@/app/components/AlbumsView';
import { BlockingLoadingOverlay } from '@/app/components/BlockingLoadingOverlay';
import { ErrorScreen } from '@/app/components/ErrorScreen';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from 'react-oidc-context';
import { useUIStore } from '@/store/uiStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { isAdminRole } from '@/utils/roleUtils';

export const BaulRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId } = useParams();
  const auth = useAuth();
  const showToastMessage = useUIStore(state => state.showToastMessage);
  const chatEnabled = useAppConfigStore(state => state.chatEnabled);
  const { run } = useAsyncAction();

  const {
    albums,
    loosePhotos,
    sharedUsers,
    baulRecuerdos,
    removalRequests,
    userProfile,
    loadAlbumPhotos,
    addBaulRecuerdo,
    renameBaul,
    createPersona,
  } = useAppStore();

  const [isLoadingAlbumPhotos, setIsLoadingAlbumPhotos] = useState(false);

  const { baul, isLoading, refreshFailed, retry } = useBaulScope(baulId);

  if (isLoading) return <div className="p-8 text-center">Cargando...</div>;

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

  const handleSelectAlbum = async (album: any) => {
    if (!auth.isAuthenticated) return;
    setIsLoadingAlbumPhotos(true);
    const result = await run(() => loadAlbumPhotos(album.id), { errorMessage: 'Error al cargar las fotos' });
    setIsLoadingAlbumPhotos(false);
    if (result.ok) navigate(`/baules/${baul.id}/albumes/${album.id}`);
  };

  const handleOpenPhotoFromRecuerdo = async (photoId: string, albumId?: string) => {
    if (!auth.isAuthenticated) return;

    // Una foto suelta no tiene albumId: sus fotos ya están cargadas por el efecto de
    // inicialización (loadLoosePhotos), así que no hace falta cargar nada antes de navegar.
    if (!albumId) {
      navigate(`/baules/${baul.id}/fotos-sueltas/foto/${photoId}`, { state: { backgroundLocation: location } });
      return;
    }

    setIsLoadingAlbumPhotos(true);
    const result = await run(() => loadAlbumPhotos(albumId), { errorMessage: 'Error al cargar las fotos' });
    setIsLoadingAlbumPhotos(false);
    if (result.ok) navigate(`/baules/${baul.id}/albumes/${albumId}/foto/${photoId}`, { state: { backgroundLocation: location } });
  };

  const handleCreatePersona = async (nickname: string): Promise<boolean> => {
    const result = await run(() => createPersona(baul.id, nickname), {
      errorMessage: 'Error al añadir la persona',
    });
    return result.ok;
  };

  const handleUpdateBaulInfo = async (name: string, description: string): Promise<boolean> => {
    const result = await run(() => renameBaul(baul.id, name, description), {
      successMessage: 'Información del baúl actualizada',
      errorMessage: 'Error al actualizar la información del baúl',
    });
    return result.ok;
  };

  const handleCreateRecuerdo = async (text: string): Promise<boolean> => {
    const result = await run(() => addBaulRecuerdo(baul.id, text), {
      errorMessage: 'Error al añadir el recuerdo',
    });
    return result.ok;
  };

  return (
    <>
      <AlbumsView
        baul={baul}
        albums={albums[baul.id] || []}
        loosePhotos={loosePhotos[baul.id] || []}
        sharedUsers={sharedUsers[baul.id] || []}
        recuerdos={baulRecuerdos[baul.id] || []}
        isAdmin={isAdminRole(baul.role)}
        currentUserEmail={userProfile.email}
        onBack={() => navigate('/baules')}
        onSelectAlbum={handleSelectAlbum}
        onCreateAlbum={() => navigate(`/baules/${baul.id}/nuevo-album`)}
        onOpenLoosePhotos={() => navigate(`/baules/${baul.id}/fotos-sueltas`)}
        onUploadPhotos={(selectedPhotos) =>
          navigate(`/baules/${baul.id}/fotos-sueltas/confirmar`, { state: { selectedPhotos } })
        }
        onPhotosDropped={(count) =>
          showToastMessage(`${count} ${count === 1 ? 'foto no se pudo leer y no se ha añadido' : 'fotos no se pudieron leer y no se han añadido'}`)
        }
        onCreatePersona={handleCreatePersona}
        onSelectPersona={(persona) => navigate(`/baules/${baul.id}/personas/${persona.id}`)}
        onCreateRecuerdo={handleCreateRecuerdo}
        onOpenChat={chatEnabled ? () => navigate(`/baules/${baul.id}/recordar`) : undefined}
        onOpenAlbumFromRecuerdo={(albumId) => handleSelectAlbum({ id: albumId })}
        onOpenPhotoFromRecuerdo={handleOpenPhotoFromRecuerdo}
        onRemovalRequests={() => navigate(`/eliminar-solicitudes/${baul.id}`)}
        pendingRemovalRequestsCount={(removalRequests[baul.id] || []).filter(r => r.status === 'pending').length}
        onUpdateBaulInfo={isAdminRole(baul.role) ? handleUpdateBaulInfo : undefined}
        onRequestBaulDeletion={() => navigate(`/baules/${baul.id}/solicitar-borrado`)}
      />
      {isLoadingAlbumPhotos && <BlockingLoadingOverlay message="Cargando fotos..." />}
    </>
  );
};
