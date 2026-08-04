import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChaptersView } from '@/features/baules/components/ChaptersView';
import { CreateChapterModal } from '@/features/chapters/components/CreateChapterModal';
import { BlockingLoadingOverlay } from '@/design-system/components/feedback/BlockingLoadingOverlay';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { useAuthStore } from '@/store/useAuthStore';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { addBaulRecuerdo, editRecuerdo } from '@/features/memories/useCases';
import { useAuth } from 'react-oidc-context';
import { useUIStore } from '@/store/uiStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { getBaulPermissions } from '@/utils/roleUtils';
import { api } from '@/api';
import { Photo, Recuerdo } from '@/types';
import { sharePublicLink } from '@/features/sharing/sharePublicLink';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';

export const BaulRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId } = useParams();
  const auth = useAuth();
  const showToastMessage = useUIStore(state => state.showToastMessage);
  const chatEnabled = useAppConfigStore(state => state.chatEnabled);
  const sharedLinksEnabled = useAppConfigStore(state => state.sharedLinksEnabled);
  const { run, isPending } = useAsyncAction();

  const { chapters, loosePhotos, loadChapterPhotos, renameBaul, setBaulCover, createChapter } = useBaulesStore();
  const { personas, removalRequests, createPersona } = usePersonasStore();
  const { baulRecuerdos } = useRecuerdosStore();
  const { userProfile } = useAuthStore();

  const [isLoadingChapterPhotos, setIsLoadingChapterPhotos] = useState(false);
  const [showCreateChapterModal, setShowCreateChapterModal] = useState(false);

  const { baul, isLoading, refreshFailed, retry } = useBaulScope(baulId);

  const initialTab = (location.state as { activeTab?: 'capitulos' | 'personas' | 'recuerdos' } | null)?.activeTab;

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

  const baulPermissions = getBaulPermissions(baul);

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
      openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baul.id}/fotos-sueltas`, photoId));
      return;
    }

    setIsLoadingChapterPhotos(true);
    const result = await run(() => loadChapterPhotos(chapterId), { errorMessage: 'Error al cargar las fotos' });
    setIsLoadingChapterPhotos(false);
    if (result.ok) openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baul.id}/capitulos/${chapterId}`, photoId));
  };

  const handleCreatePersona = async (nickname: string): Promise<boolean> => {
    const result = await run(() => createPersona(baul.id, nickname), {
      errorMessage: 'Error al añadir la persona',
    });
    return result.ok;
  };

  const handleCreateChapter = async (name: string) => {
    if (!auth.isAuthenticated) return;

    const result = await run(() => createChapter(baul.id, name), {
      key: 'create-chapter',
      errorMessage: 'Error al crear el capítulo',
    });
    if (result.ok) setShowCreateChapterModal(false);
  };

  const handleUpdateBaulInfo = async (name: string, description: string): Promise<boolean> => {
    const result = await run(() => renameBaul(baul.id, name, description), {
      successMessage: 'Información del baúl actualizada',
      errorMessage: 'Error al actualizar la información del baúl',
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

  const handleCreateRecuerdo = async (text: string): Promise<boolean> => {
    const result = await run(() => addBaulRecuerdo(baul.id, text), {
      errorMessage: 'Error al añadir el recuerdo',
    });
    return result.ok;
  };

  const handleEditRecuerdo = async (recuerdo: Recuerdo, text: string): Promise<boolean> => {
    const result = await run(() => editRecuerdo(recuerdo.id, text), {
      successMessage: 'Recuerdo actualizado',
      errorMessage: 'Error al guardar el recuerdo',
    });
    return result.ok;
  };

  const handleShareRecuerdo = async (recuerdo: Recuerdo) => {
    const result = await run(() => api.recuerdos.createShareLink(recuerdo.id), {
      key: 'share-recuerdo',
      errorMessage: 'Error al crear el enlace',
    });
    if (!result.ok) return;

    await sharePublicLink({
      title: `Recuerdo de ${baul.name}`,
      text: `Te comparto un recuerdo de "${baul.name}" en El Baúl.`,
      url: result.value.url,
      onCopied: () => showToastMessage('Enlace copiado al portapapeles'),
    });
  };

  return (
    <>
      <ChaptersView
        baul={baul}
        chapters={chapters[baul.id] || []}
        loosePhotos={loosePhotos[baul.id] || []}
        personas={personas[baul.id] || []}
        recuerdos={baulRecuerdos[baul.id] || []}
        baulPermissions={baulPermissions}
        currentUserEmail={userProfile.email}
        initialTab={initialTab}
        onBack={() => navigate('/baules')}
        onSelectChapter={handleSelectChapter}
        onCreateChapter={() => setShowCreateChapterModal(true)}
        onOpenLoosePhotos={() => navigate(`/baules/${baul.id}/fotos-sueltas`)}
        onUploadPhotos={(selectedPhotos) =>
          navigate(`/baules/${baul.id}/fotos-sueltas/confirmar`, { state: { selectedPhotos } })
        }
        onPhotosDropped={(count) =>
          showToastMessage(`${count} ${count === 1 ? 'foto no se pudo leer y no se ha añadido' : 'fotos no se pudieron leer y no se han añadido'}`, 'error')
        }
        onCreatePersona={handleCreatePersona}
        onSelectPersona={(persona) =>
          navigate(`/baules/${baul.id}/personas/${persona.id}`, { state: { returnTab: 'personas' } })
        }
        onCreateRecuerdo={handleCreateRecuerdo}
        onOpenChat={chatEnabled ? () => navigate(`/baules/${baul.id}/recordar`) : undefined}
        onOpenChapterFromRecuerdo={(chapterId) => handleSelectChapter({ id: chapterId })}
        onOpenPhotoFromRecuerdo={handleOpenPhotoFromRecuerdo}
        onUserClick={(personaId) =>
          navigate(`/baules/${baul.id}/personas/${personaId}`, { state: { returnTab: 'recuerdos' } })
        }
        onShareRecuerdo={sharedLinksEnabled ? handleShareRecuerdo : undefined}
        onEditRecuerdo={handleEditRecuerdo}
        onRemovalRequests={() => navigate(`/eliminar-solicitudes/${baul.id}`)}
        pendingRemovalRequestsCount={(removalRequests[baul.id] || []).filter(r => r.status === 'pending').length}
        onUpdateBaulInfo={baulPermissions.canEditBaul ? handleUpdateBaulInfo : undefined}
        onRequestBaulDeletion={() => navigate(`/baules/${baul.id}/solicitar-borrado`)}
        onFetchBaulCoverPhotos={baulPermissions.canSetBaulCover ? (skip, take) => api.photos.getPage(baul.id, { skip, take }) : undefined}
        onSetBaulCover={baulPermissions.canSetBaulCover ? handleSetBaulCover : undefined}
        onGetInviteLink={baulPermissions.canManageBaulInvite ? () => api.baules.getInviteLink(baul.id) : undefined}
        onRegenerateInviteLink={baulPermissions.canManageBaulInvite ? () => api.baules.regenerateInviteLink(baul.id) : undefined}
      />
      {isLoadingChapterPhotos && <BlockingLoadingOverlay message="Cargando fotos..." />}
      {showCreateChapterModal && (
        <CreateChapterModal
          onCancel={() => setShowCreateChapterModal(false)}
          onSave={handleCreateChapter}
          isSubmitting={isPending('create-chapter')}
        />
      )}
    </>
  );
};
