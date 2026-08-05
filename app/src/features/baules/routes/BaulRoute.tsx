import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChaptersView } from '@/features/baules/components/ChaptersView';
import { CreateChapterModal } from '@/features/chapters/components/CreateChapterModal';
import { BlockingLoadingOverlay } from '@/design-system/components/feedback/BlockingLoadingOverlay';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { renameBaul, setBaulCover } from '@/features/baules/useCases';
import { loadChapterPhotos } from '@/features/photos/useCases';
import { createChapter } from '@/features/chapters/useCases';
import { useAuth } from 'react-oidc-context';
import { useUIStore } from '@/store/uiStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { getBaulPermissions } from '@/utils/roleUtils';
import { api } from '@/api';
import { Photo } from '@/types';

export const BaulRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId } = useParams();
  const auth = useAuth();
  const showToastMessage = useUIStore(state => state.showToastMessage);
  const { run, isPending } = useAsyncAction();

  const { chapters, loosePhotos } = useBaulesStore();
  // Solo para los badges de recuento del Tabbar — PersonasTabContainer/RecuerdosTabContainer
  // leen los datos completos ellos mismos.
  const { personas, removalRequests } = usePersonasStore();
  const { baulRecuerdos } = useRecuerdosStore();

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

  const handleSelectChapter = async (chapter: { id: string }) => {
    if (!auth.isAuthenticated) return;
    setIsLoadingChapterPhotos(true);
    const result = await run(() => loadChapterPhotos(chapter.id), { errorMessage: 'Error al cargar las fotos' });
    setIsLoadingChapterPhotos(false);
    if (result.ok) navigate(`/baules/${baul.id}/capitulos/${chapter.id}`);
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

  return (
    <>
      <ChaptersView
        baul={baul}
        chapters={chapters[baul.id] || []}
        loosePhotos={loosePhotos[baul.id] || []}
        personasCount={(personas[baul.id] || []).length}
        recuerdosCount={(baulRecuerdos[baul.id] || []).length}
        baulPermissions={baulPermissions}
        initialTab={initialTab}
        onBack={() => navigate('/baules')}
        onSelectChapter={handleSelectChapter}
        onCreateChapter={() => setShowCreateChapterModal(true)}
        onToast={showToastMessage}
        onOpenLoosePhotos={() => navigate(`/baules/${baul.id}/fotos-sueltas`)}
        onUploadPhotos={() => navigate(`/baules/${baul.id}/fotos-sueltas/confirmar`)}
        onOpenChapterFromRecuerdo={(chapterId) => handleSelectChapter({ id: chapterId })}
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
