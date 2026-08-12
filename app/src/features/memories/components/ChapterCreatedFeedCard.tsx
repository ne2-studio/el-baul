import React from 'react';
import { ChapterCreatedFeed } from '@/types';
import { Button } from '@/design-system/components/actions/Button';
import { NewDot } from '@/design-system/components/data-display/Badges';
import { FeedCardHeader } from '@/design-system/components/data-display/FeedCardHeader';
import { cn } from '@/design-system/components/ui/utils';

interface ChapterCreatedFeedCardProps {
  chapter: ChapterCreatedFeed;
  onUserClick?: (personaId: string) => void;
  onOpenChapter?: (chapterId: string) => void;
  /** Actividad desde la última visita a este baúl — pinta un hint visual sutil (ver
   * FeedItem.isNew). */
  isNew?: boolean;
}

// Feed card announcing a new chapter — mirrors RecuerdoFeedCard/PhotoBatchCard's shape (same
// FeedCardHeader, same card chrome), whole card opens the chapter since there's no separate
// body content to click into.
export function ChapterCreatedFeedCard({ chapter, onUserClick, onOpenChapter, isNew = false }: ChapterCreatedFeedCardProps) {
  const canOpenPersona = !!(chapter.personaId && onUserClick);

  return (
    <div className={cn(
      'relative rounded-2xl p-5 border',
      isNew ? 'bg-primary/5 border-primary/20' : 'bg-card border-border/60',
    )}>
      {isNew && <NewDot className="absolute top-4 right-4" />}
      <FeedCardHeader
        name={chapter.userName}
        avatarUrl={chapter.userAvatar}
        actionText="creó un capítulo nuevo"
        timestamp={chapter.createdAt}
        onAvatarClick={canOpenPersona ? () => onUserClick!(chapter.personaId!) : undefined}
      />

      <Button variant="plain"
        type="button"
        aria-label={`Abrir capítulo ${chapter.name}`}
        onClick={() => onOpenChapter?.(chapter.chapterId)}
        className="mt-3 flex w-full items-center gap-3 rounded-xl bg-secondary p-2 text-left hover:bg-secondary/80 transition-colors"
      >
        {chapter.coverPhotoUrl && (
          <img src={chapter.coverPhotoUrl} alt="" className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{chapter.name}</span>
      </Button>
    </div>
  );
}
