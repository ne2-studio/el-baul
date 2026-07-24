import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChaptersView } from '@/app/components/ChaptersView';
import { BlockingLoadingOverlay } from '@/app/components/BlockingLoadingOverlay';
import { ErrorScreen } from '@/app/components/ErrorScreen';
import { useAuthStore } from '@/store/useAuthStore';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
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

  const { chapters, loosePhotos, loadChapterPhotos, renameBaul } = useBaulesStore();
  const { personas, removalRequests, createPersona } = usePersonasStore();
  const { baulRecuerdos, addBaulRecuerdo } = useRecuerdosStore();
  const { userProfile } = useAuthStore();

  const [isLoadingChapterPhotos, setIsLoadingChapterPhotos] = useState(false);

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

  const handleSelectChapter = async (chapter: any) => {
    if (!auth.isAuthenticated) return;
    setIsLoadingChapterPhotos(true);
    const result = await run(() => loadChapterPhotos(chapter.id), { errorMessage: 'Error al cargar las fotos' });
    setIsLoadingChapterPhotos(false);
    if (result.ok) navigate(`/baules/${baul.id}/capitulos/${chapter.id}`);
  };

  const handleOpenPhotoFromRecuerdo = async (photoId: string, chapterId?: string) => {
    if (!auth.isAuthenticated) return;

    // Una foto suelta no tiene chapterId: sus fotos ya están cargadas por el efecto de
    // inicialización (loadLoosePhotos), así que no hace falta cargar nada antes de navegar.
    if (!chapterId) {
      navigate(`/baules/${baul.id}/fotos-sueltas/foto/${photoId}`, { state: { backgroundLocation: location } });
      return;
    }

    setIsLoadingChapterPhotos(true);
    const result = await run(() => loadChapterPhotos(chapterId), { errorMessage: 'Error al cargar las fotos' });
    setIsLoadingChapterPhotos(false);
    if (result.ok) navigate(`/baules/${baul.id}/capitulos/${chapterId}/foto/${photoId}`, { state: { backgroundLocation: location } });
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
      <ChaptersView
        baul={baul}
        chapters={chapters[baul.id] || []}
        loosePhotos={loosePhotos[baul.id] || []}
        personas={personas[baul.id] || []}
        recuerdos={baulRecuerdos[baul.id] || []}
        isAdmin={isAdminRole(baul.role)}
        currentUserEmail={userProfile.email}
        onBack={() => navigate('/baules')}
        onSelectChapter={handleSelectChapter}
        onCreateChapter={() => navigate(`/baules/${baul.id}/nuevo-capitulo`)}
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
        onOpenChapterFromRecuerdo={(chapterId) => handleSelectChapter({ id: chapterId })}
        onOpenPhotoFromRecuerdo={handleOpenPhotoFromRecuerdo}
        onRemovalRequests={() => navigate(`/eliminar-solicitudes/${baul.id}`)}
        pendingRemovalRequestsCount={(removalRequests[baul.id] || []).filter(r => r.status === 'pending').length}
        onUpdateBaulInfo={isAdminRole(baul.role) ? handleUpdateBaulInfo : undefined}
        onRequestBaulDeletion={() => navigate(`/baules/${baul.id}/solicitar-borrado`)}
      />
      {isLoadingChapterPhotos && <BlockingLoadingOverlay message="Cargando fotos..." />}
    </>
  );
};
