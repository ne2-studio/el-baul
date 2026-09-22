import React from 'react';
import { ImageIcon, MessageCircle } from 'lucide-react';
import { ContentCard, ContentCardCounter } from '@/design-system/components/data-display/ContentCard';
import { Chapter } from '@/types';
import { formatDateRange } from '@/app/utils/timeUtils';

interface ChapterCardProps {
  chapter: Chapter;
  onClick: () => void;
}

// Mismo lenguaje visual y tamaño que BaulCard — ver ContentCard en docs/DESIGN.md.
export function ChapterCard({ chapter, onClick }: ChapterCardProps) {
  const counters: ContentCardCounter[] = [
    { icon: <ImageIcon />, label: `${chapter.photoCount} ${chapter.photoCount === 1 ? 'foto' : 'fotos'}` },
  ];
  if ((chapter.recuerdoCount ?? 0) > 0) {
    counters.push({ icon: <MessageCircle />, label: `${chapter.recuerdoCount} ${chapter.recuerdoCount === 1 ? 'recuerdo' : 'recuerdos'}` });
  }

  return (
    <ContentCard
      title={chapter.name}
      coverImageUrl={chapter.coverPhotoUrl}
      subtitle={chapter.minDate && chapter.maxDate ? formatDateRange(chapter.minDate, chapter.maxDate) : undefined}
      counters={counters}
      onClick={onClick}
    />
  );
}
