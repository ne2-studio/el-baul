import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RecuerdosTab } from '@/features/memories/components/RecuerdosTab';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { loadChapterPhotos } from '@/features/photos/useCases';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useRecuerdoActions } from './useRecuerdoActions';

interface PersonaRecuerdosTabContainerProps {
  baulId: string;
  personaId: string;
}

// Self-sufficient tab: filtra los recuerdos del baúl (ya cargados por usePersonaScope, igual
// que la persona y sus fotos) por autor — no hay un endpoint dedicado "recuerdos de una
// persona", el propio Recuerdo ya trae personaId. Sin onUserClick: todos los recuerdos aquí
// son de la propia persona cuya ficha se está viendo, así que tocar el avatar del autor no
// llevaría a ningún sitio nuevo. Comparte edición/compartir con BaulRecuerdosTabContainer y
// ChapterRecuerdosFeedContainer vía useRecuerdoActions — ver ese archivo.
export function PersonaRecuerdosTabContainer({ baulId, personaId }: PersonaRecuerdosTabContainerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulRecuerdos } = useRecuerdosStore();
  const { baules } = useBaulesStore();
  const sharedLinksEnabled = useAppConfigStore((state) => state.sharedLinksEnabled);
  const baulName = baules.find((b) => b.id === baulId)?.name ?? '';
  const { editRecuerdo, shareRecuerdo } = useRecuerdoActions(baulName);
  const { run } = useAsyncAction();

  const recuerdos = (baulRecuerdos[baulId] || []).filter((recuerdo) => recuerdo.personaId === personaId);

  const handleOpenChapter = async (chapterId: string) => {
    const result = await run(() => loadChapterPhotos(chapterId), { errorMessage: 'Error al cargar las fotos' });
    if (result.ok) navigate(`/baules/${baulId}/capitulos/${chapterId}`);
  };

  const handleOpenPhoto = async (photoId: string, chapterId?: string) => {
    // Una foto suelta no tiene chapterId: ya está cargada por loadLoosePhotos (useBaulScope),
    // así que no hace falta cargar nada antes de navegar — mismo patrón que
    // BaulRecuerdosTabContainer.
    if (!chapterId) {
      openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baulId}/fotos-sueltas`, photoId));
      return;
    }

    const result = await run(() => loadChapterPhotos(chapterId), { errorMessage: 'Error al cargar las fotos' });
    if (result.ok) openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baulId}/capitulos/${chapterId}`, photoId));
  };

  return (
    <RecuerdosTab
      recuerdos={recuerdos}
      onOpenChapter={handleOpenChapter}
      onOpenPhoto={handleOpenPhoto}
      onShareRecuerdo={sharedLinksEnabled ? shareRecuerdo : undefined}
      onEditRecuerdo={editRecuerdo}
    />
  );
}
