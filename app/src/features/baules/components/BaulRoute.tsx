import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlbumsView } from '@/app/components/AlbumsView';
import { BlockingLoadingOverlay } from '@/app/components/BlockingLoadingOverlay';
import { ErrorScreen } from '@/app/components/ErrorScreen';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from 'react-oidc-context';
import { useUIStore } from '@/store/uiStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { isAdminRole } from '@/utils/roleUtils';

export const BaulRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const auth = useAuth();
  const showToastMessage = useUIStore(state => state.showToastMessage);
  const { run } = useAsyncAction();

  const {
    baules,
    albums,
    loosePhotos,
    sharedUsers,
    baulRecuerdos,
    removalRequests,
    userProfile,
    loadAlbumPhotos,
    loadAlbums,
    loadLoosePhotos,
    loadBaulRecuerdos,
    addBaulRecuerdo,
    fetchData,
    renameBaul,
    createPersona,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAlbumPhotos, setIsLoadingAlbumPhotos] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);

  const baul = baules.find(b => b.id === baulId);

  const attemptRefresh = async () => {
    setIsLoading(true);
    const result = await run(() => fetchData(), {
      key: 'refresh-baul',
      errorMessage: 'No se pudo cargar el baúl. Comprueba tu conexión e inténtalo de nuevo.',
    });
    setRefreshFailed(!result.ok);
    setIsLoading(false);
  };

  useEffect(() => {
    async function initBaul() {
      if (!baulId || !auth.isAuthenticated) return;

      // Si el baúl no está en la lista de baúles, intentamos recargar los datos del usuario
      if (!baul) {
        await attemptRefresh();
        return; // El siguiente renderizado tendrá el baúl (si existe) y se ejecutará el siguiente if
      }

      // Capítulos y fotos sueltas puede que ya estén cargados: BaulesListRoute los carga él
      // mismo antes de navegar aquí (para no mostrar la pantalla vacía un instante). Los
      // recuerdos del baúl no se prefetchan en ningún otro sitio, así que se comprueban con
      // su propia guarda independiente en vez de colgarse de la de capítulos.
      const needsAlbums = !albums[baulId];
      const needsRecuerdos = !baulRecuerdos[baulId];

      if (needsAlbums || needsRecuerdos) {
        setIsLoading(true);
        await run(() => Promise.all([
          ...(needsAlbums ? [loadAlbums(baulId), loadLoosePhotos(baulId)] : []),
          ...(needsRecuerdos ? [loadBaulRecuerdos(baulId)] : []),
        ]), {
          errorMessage: 'Error al cargar los capítulos del baúl',
        });
        setIsLoading(false);
      }
    }

    initBaul();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId, auth.isAuthenticated, baul, albums, baulRecuerdos, loadAlbums, loadLoosePhotos, loadBaulRecuerdos, fetchData]);

  if (isLoading) return <div className="p-8 text-center">Cargando...</div>;

  if (!baul) {
    if (refreshFailed) {
      return (
        <ErrorScreen
          title="No se ha podido cargar el baúl"
          message="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={attemptRefresh}
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
        onOpenAlbumFromRecuerdo={(albumId) => handleSelectAlbum({ id: albumId })}
        onRemovalRequests={() => navigate(`/eliminar-solicitudes/${baul.id}`)}
        pendingRemovalRequestsCount={(removalRequests[baul.id] || []).filter(r => r.status === 'pending').length}
        onUpdateBaulInfo={isAdminRole(baul.role) ? handleUpdateBaulInfo : undefined}
      />
      {isLoadingAlbumPhotos && <BlockingLoadingOverlay message="Cargando fotos..." />}
    </>
  );
};
