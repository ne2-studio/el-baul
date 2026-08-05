import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { Sparkles } from 'lucide-react';
import { RecuerdosTab } from '@/features/memories/components/RecuerdosTab';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useRecuerdoActions } from './useRecuerdoActions';

interface RecuerdosTabContainerProps {
  baulId: string;
  baulName: string;
  // Comparten estado de carga (isLoadingChapterPhotos) con la pestaña de capítulos de
  // BaulRoute, así que se quedan como callbacks pasados desde ahí en vez de duplicarse aquí.
  onOpenChapter?: (chapterId: string) => void;
  onOpenPhoto?: (photoId: string, chapterId?: string) => void;
}

// Self-sufficient tab: reads baulRecuerdos itself and owns edit/share via useRecuerdoActions.
// Navigates to a persona's detail screen and to the AI chat itself — both only need baulId,
// nothing route-context-dependent — see docs/architecture/frontend.md's containers/ rule.
export function RecuerdosTabContainer({ baulId, baulName, onOpenChapter, onOpenPhoto }: RecuerdosTabContainerProps) {
  const navigate = useNavigate();
  const { baulRecuerdos } = useRecuerdosStore();
  const chatEnabled = useAppConfigStore((state) => state.chatEnabled);
  const sharedLinksEnabled = useAppConfigStore((state) => state.sharedLinksEnabled);
  const { editRecuerdo, shareRecuerdo } = useRecuerdoActions(baulName);

  const handleUserClick = (personaId: string) => {
    navigate(`/baules/${baulId}/personas/${personaId}`, { state: { returnTab: 'recuerdos' } });
  };

  return (
    <>
      <RecuerdosTab
        recuerdos={baulRecuerdos[baulId] || []}
        onOpenChapter={onOpenChapter}
        onOpenPhoto={onOpenPhoto}
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
    </>
  );
}
