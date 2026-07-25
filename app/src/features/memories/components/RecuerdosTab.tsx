import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Recuerdo } from '@/types';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { RecuerdoFeedCard } from '@/features/memories/components/RecuerdoFeedCard';

interface RecuerdosTabProps {
  recuerdos: Recuerdo[];
  onOpenChapter?: (chapterId: string) => void;
  onOpenPhoto?: (photoId: string, chapterId?: string) => void;
  onUserClick?: (personaId: string) => void;
}

export function RecuerdosTab({ recuerdos, onOpenChapter, onOpenPhoto, onUserClick }: RecuerdosTabProps) {
  if (recuerdos.length === 0) {
    return (
      <EmptyState
        icon={<MessageCircle className="w-20 h-20" strokeWidth={1.5} />}
        title="Todavía no hay recuerdos"
        subtitle="Añade el primero desde el botón de abajo"
      />
    );
  }

  return (
    <div className="space-y-4">
      {recuerdos.map((recuerdo) => (
        <RecuerdoFeedCard
          key={recuerdo.id}
          recuerdo={recuerdo}
          onUserClick={onUserClick}
          onPhotoClick={() => onOpenPhoto?.(recuerdo.photoId!, recuerdo.chapterId)}
          onChapterClick={onOpenChapter}
        />
      ))}
    </div>
  );
}
