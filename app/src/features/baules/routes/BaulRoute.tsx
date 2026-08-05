import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChaptersView } from '@/features/baules/components/ChaptersView';
import { CreateChapterModal } from '@/features/chapters/components/CreateChapterModal';
import { BlockingLoadingOverlay } from '@/design-system/components/feedback/BlockingLoadingOverlay';
import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { loadChapterPhotos } from '@/features/photos/useCases';
import { createChapter } from '@/features/chapters/useCases';
import { useAuth } from 'react-oidc-context';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { getBaulPermissions } from '@/utils/roleUtils';

export const BaulRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulId } = useParams();
  const auth = useAuth();
  const { run, isPending } = useAsyncAction();

  const { chapters, loosePhotos } = useBaulesStore();
  // Solo para los badges de recuento del Tabbar — PersonasTabContainer/RecuerdosTabContainer
  // leen los datos completos ellos mismos.
  const { personas } = usePersonasStore();
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
        onOpenLoosePhotos={() => navigate(`/baules/${baul.id}/fotos-sueltas`)}
        onUploadPhotos={() => navigate(`/baules/${baul.id}/fotos-sueltas/confirmar`)}
        onOpenChapterFromRecuerdo={(chapterId) => handleSelectChapter({ id: chapterId })}
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
