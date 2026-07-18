import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlbumsView } from '@/app/components/AlbumsView';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from 'react-oidc-context';
import { useUIStore } from '@/store/uiStore';

export const BaulRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const auth = useAuth();
  const showToastMessage = useUIStore(state => state.showToastMessage);

  const {
    baules,
    albums,
    loosePhotos,
    removalRequests,
    loadAlbumPhotos,
    loadAlbums,
    loadLoosePhotos,
    fetchData,
    renameBaul
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);
  
  const baul = baules.find(b => b.id === baulId);

  useEffect(() => {
    async function initBaul() {
      if (!baulId || !auth.isAuthenticated) return;

      // Si el baúl no está en la lista de baúles, intentamos recargar los datos del usuario
      if (!baul) {
        try {
          setIsLoading(true);
          await fetchData();
        } catch (error) {
          console.error('Error refreshing user data:', error);
        } finally {
          setIsLoading(false);
        }
        return; // El siguiente renderizado tendrá el baúl (si existe) y se ejecutará el siguiente if
      }

      // Si el baúl no tiene capítulos cargados en el store, los cargamos
      if (!albums[baulId]) {
        try {
          setIsLoading(true);
          await Promise.all([loadAlbums(baulId), loadLoosePhotos(baulId)]);
        } catch (error) {
          console.error('Error loading albums on route enter:', error);
          showToastMessage('Error al cargar los capítulos del baúl');
        } finally {
          setIsLoading(false);
        }
      }
    }

    initBaul();
  }, [baulId, auth.isAuthenticated, baul, albums, loadAlbums, loadLoosePhotos, fetchData, showToastMessage]);
  
  if (isLoading) return <div className="p-8 text-center">Cargando...</div>;
  if (!baul) return <div className="p-8 text-center">No se ha encontrado el baúl.</div>;
  
  const handleSelectAlbum = async (album: any) => {
    if (!auth.isAuthenticated) return;
    try {
      await loadAlbumPhotos(album.id);
      navigate(`/baules/${baul.id}/albumes/${album.id}`);
    } catch (error) {
      console.error('Error loading photos:', error);
      showToastMessage('Error al cargar las fotos');
    }
  };
  
  const handleShareBaul = async () => {
    if (!baul) return;
    
    const inviteUrl = `${window.location.origin}/invitacion/${baul.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invitación a ${baul.name}`,
          text: `Te invito a unirte a mi baúl de recuerdos "${baul.name}" en El Baúl.`,
          url: inviteUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
          copyToClipboard(inviteUrl);
        }
      }
    } else {
      copyToClipboard(inviteUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToastMessage('Enlace de invitación copiado al portapapeles');
    }).catch(err => {
      console.error('Error copying to clipboard:', err);
      showToastMessage('Error al copiar el enlace');
    });
  };

  const handleUpdateBaulInfo = (name: string, description: string) => {
    renameBaul(baul.id, name, description)
      .then(() => showToastMessage('Información del baúl actualizada'))
      .catch((error) => {
        console.error('Error updating baul info:', error);
        showToastMessage('Error al actualizar la información del baúl');
      });
  };

  return (
    <AlbumsView
      baul={baul}
      albums={albums[baul.id] || []}
      loosePhotos={loosePhotos[baul.id] || []}
      onBack={() => navigate('/baules')}
      onSelectAlbum={handleSelectAlbum}
      onCreateAlbum={() => navigate(`/baules/${baul.id}/nuevo-album`)}
      onOpenLoosePhotos={() => navigate(`/baules/${baul.id}/fotos-sueltas`)}
      onUploadPhotos={(selectedPhotos) =>
        navigate(`/baules/${baul.id}/fotos-sueltas/confirmar`, { state: { selectedPhotos } })
      }
      onShareBaul={handleShareBaul}
      onManagePeople={() => navigate(`/personas/${baul.id}`)}
      onRemovalRequests={() => navigate(`/eliminar-solicitudes/${baul.id}`)}
      pendingRemovalRequestsCount={(removalRequests[baul.id] || []).filter(r => r.status === 'pending').length}
      onUpdateBaulInfo={baul.isCustodio ? handleUpdateBaulInfo : undefined}
    />
  );
};
