import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { BlockingLoadingOverlay } from '@/design-system/components/feedback/BlockingLoadingOverlay';
import { Sparkles } from 'lucide-react';
import { RecuerdosTab } from '@/features/memories/components/RecuerdosTab';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { loadChapterPhotos } from '@/features/photos/useCases';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useRecuerdoActions } from './useRecuerdoActions';

interface BaulRecuerdosTabContainerProps {
  baulId: string;
  baulName: string;
  // Reutiliza handleSelectChapter de BaulRoute (compartido con la pestaña de capítulos) en
  // vez de duplicar aquí su lógica de cargar-y-navegar — a diferencia de abrir una foto
  // (más abajo), esta acción sí tiene un caller que ya la necesita para otra cosa.
  onOpenChapter?: (chapterId: string) => void;
}

// Self-sufficient tab: reads baulRecuerdos itself and owns edit/share via useRecuerdoActions,
// and opening a photo referenced by a recuerdo (nothing else reuses that flow, so unlike
// onOpenChapter above it doesn't need to come in as a callback). Navigates to a persona's
// detail screen and to the AI chat itself too — all of it only needs baulId/chapterId,
// nothing route-context-dependent beyond its own location — see
// docs/architecture/frontend.md's containers/ rule.
export function BaulRecuerdosTabContainer({ baulId, baulName, onOpenChapter }: BaulRecuerdosTabContainerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulRecuerdos } = useRecuerdosStore();
  const chatEnabled = useAppConfigStore((state) => state.chatEnabled);
  const sharedLinksEnabled = useAppConfigStore((state) => state.sharedLinksEnabled);
  const { editRecuerdo, shareRecuerdo } = useRecuerdoActions(baulName);
  const { run, isPending } = useAsyncAction();

  const handleUserClick = (personaId: string) => {
    navigate(`/baules/${baulId}/personas/${personaId}`, { state: { returnTab: 'recuerdos' } });
  };

  const handleOpenPhoto = async (photoId: string, chapterId?: string) => {
    // Una foto suelta no tiene chapterId: sus fotos ya están cargadas por el efecto de
    // inicialización de BaulRoute (loadLoosePhotos), así que no hace falta cargar nada
    // antes de navegar.
    if (!chapterId) {
      openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baulId}/fotos-sueltas`, photoId));
      return;
    }

    const result = await run(() => loadChapterPhotos(chapterId), { errorMessage: 'Error al cargar las fotos' });
    if (result.ok) openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baulId}/capitulos/${chapterId}`, photoId));
  };

  return (
    <>
      <RecuerdosTab
        recuerdos={baulRecuerdos[baulId] || []}
        onOpenChapter={onOpenChapter}
        onOpenPhoto={handleOpenPhoto}
        onUserClick={handleUserClick}
        onShareRecuerdo={sharedLinksEnabled ? shareRecuerdo : undefined}
        onEditRecuerdo={editRecuerdo}
      />
      <SimpleFAB
        label="Ayúdame a recordar"
        icon={<Sparkles className="w-5 h-5" />}
        onClick={() => navigate(`/baules/${baulId}/recordar`)}
        hidden={!chatEnabled}
      />
      {isPending() && <BlockingLoadingOverlay message="Cargando fotos..." />}
    </>
  );
}
