import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { RecuerdosTab } from '@/features/memories/components/RecuerdosTab';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { openPhotoViewer, photoViewerPath } from '@/features/photos/viewerNavigation';
import { useRecuerdoActions } from '@/features/memories/containers/useRecuerdoActions';

interface PersonaRecuerdosTabContainerProps {
  baulId: string;
  personaId: string;
}

// Self-sufficient tab: filtra los recuerdos del baúl (ya cargados por usePersonaScope, igual
// que la persona y sus fotos etiquetadas) por foto — muestra los recuerdos de las fotos en las
// que esta persona está etiquetada, no los que ella misma ha escrito, así que puede incluir
// recuerdos de otras personas y onUserClick sí lleva a algún sitio nuevo (a diferencia de la
// versión anterior de esta pestaña, eliminada en e3d7c597). Toda foto mostrada aquí está por
// construcción en personaPhotos[personaId], así que "Ver foto" siempre puede abrir el visor
// con scope de persona sin comprobaciones adicionales — mismo patrón que
// PersonaFotosTabContainer. Comparte edición/compartir con BaulFeedTabContainer y
// ChapterRecuerdosFeedContainer vía useRecuerdoActions — ver ese archivo. Sin FAB ni input de
// añadir recuerdo — por eso usa RecuerdosTab (lista pura) en vez de RecuerdosFeed, y sustituye
// su empty state por defecto (que menciona un botón inexistente aquí) por uno propio.
export function PersonaRecuerdosTabContainer({ baulId, personaId }: PersonaRecuerdosTabContainerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { baulRecuerdos } = useRecuerdosStore();
  const { personaPhotos } = usePersonasStore();
  const { baules } = useBaulesStore();
  const sharedLinksEnabled = useAppConfigStore((state) => state.sharedLinksEnabled);
  const baulName = baules.find((b) => b.id === baulId)?.name ?? '';
  const { editRecuerdo, shareRecuerdo } = useRecuerdoActions(baulName);

  const taggedPhotoIds = new Set(personaPhotos[personaId] || []);
  const recuerdos = (baulRecuerdos[baulId] || []).filter((recuerdo) => !!recuerdo.photoId && taggedPhotoIds.has(recuerdo.photoId));

  if (recuerdos.length === 0) {
    return (
      <EmptyState
        icon={<MessageCircle className="w-20 h-20" strokeWidth={1.5} />}
        title="Todavía no hay recuerdos"
        subtitle="Los recuerdos de las fotos en las que etiquetes a esta persona aparecerán aquí"
      />
    );
  }

  const handleUserClick = (authorPersonaId: string) => {
    navigate(`/baules/${baulId}/personas/${authorPersonaId}`);
  };

  const handleOpenPhoto = (photoId: string) => {
    openPhotoViewer(navigate, location, photoViewerPath(`/baules/${baulId}/personas/${personaId}`, photoId));
  };

  return (
    <RecuerdosTab
      recuerdos={recuerdos}
      onOpenPhoto={handleOpenPhoto}
      onUserClick={handleUserClick}
      onShareRecuerdo={sharedLinksEnabled ? shareRecuerdo : undefined}
      onEditRecuerdo={editRecuerdo}
    />
  );
}
