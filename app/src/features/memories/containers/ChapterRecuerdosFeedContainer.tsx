import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RecuerdosFeed } from '@/features/memories/components/RecuerdosFeed';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useUIStore } from '@/store/uiStore';
import { addChapterRecuerdo } from '@/features/memories/useCases';
import { Photo } from '@/types';
import { useRecuerdoActions } from './useRecuerdoActions';
import { usePostHog } from 'posthog-js/react';

interface ChapterRecuerdosFeedContainerProps {
  active: boolean;
  baulId: string;
  baulName: string;
  chapterId: string;
  photos: Photo[];
  // Needs resolvePhotoRouteContext's basePath + the viewer's overlay state — route-context-
  // dependent, so it stays a callback from ChapterRoute instead of self-navigating.
  onSelectPhoto: (photo: Photo) => void;
  selectionMode: boolean;
}

// Self-sufficient chapter recuerdos feed: reads chapterRecuerdos itself and owns add/edit/share.
// Navigates to a persona's detail screen itself — only needs baulId + personaId, nothing
// route-context-dependent — see docs/architecture/frontend.md's containers/ rule.
export function ChapterRecuerdosFeedContainer({
  active, baulId, baulName, chapterId, photos, onSelectPhoto, selectionMode,
}: ChapterRecuerdosFeedContainerProps) {
  const navigate = useNavigate();
  const { chapterRecuerdos } = useRecuerdosStore();
  const sharedLinksEnabled = useAppConfigStore((state) => state.sharedLinksEnabled);
  const showToastMessage = useUIStore((state) => state.showToastMessage);
  const { editRecuerdo, shareRecuerdo } = useRecuerdoActions(baulName);
  const posthog = usePostHog();

  const handleAddRecuerdo = (text: string) => {
    addChapterRecuerdo(baulId, chapterId, text)
      .then(() => posthog.capture('memory_created'))
      .catch((error) => {
        console.error('Error adding recuerdo:', error);
        showToastMessage('Error al guardar el recuerdo', 'error');
      });
  };

  const handleUserClick = (personaId: string) => {
    navigate(`/baules/${baulId}/personas/${personaId}`);
  };

  return (
    <RecuerdosFeed
      active={active}
      photos={photos}
      recuerdos={chapterRecuerdos[chapterId] || []}
      onSelectPhoto={onSelectPhoto}
      onAddRecuerdo={handleAddRecuerdo}
      onUserClick={handleUserClick}
      onShareRecuerdo={sharedLinksEnabled ? shareRecuerdo : undefined}
      onEditRecuerdo={editRecuerdo}
      selectionMode={selectionMode}
    />
  );
}
