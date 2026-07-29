import React from 'react';
import { ImageIcon } from 'lucide-react';
import { Card } from '@/design-system/components/data-display/Card';
import { Chapter } from '@/types';
import { formatDateRange } from '@/app/utils/timeUtils';

interface ChapterCardProps {
  chapter: Chapter;
  onClick: () => void;
}

export function ChapterCard({ chapter, onClick }: ChapterCardProps) {
  return (
    <Card onClick={onClick} className="!p-0 overflow-hidden">
      {/* Chapter cover */}
      <div className="aspect-square bg-secondary flex items-center justify-center">
        {chapter.coverPhotoUrl ? (
          <img
            src={chapter.coverPhotoUrl}
            alt={chapter.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="w-12 h-12 text-muted-foreground opacity-40" strokeWidth={1.5} />
        )}
      </div>

      {/* Chapter info */}
      <div className="p-4">
        <h3 className="font-medium mb-1 text-foreground">{chapter.name}</h3>
        {chapter.minDate && chapter.maxDate && (
          <p className="text-[11px] text-primary/80 font-medium mb-0.5">
            {formatDateRange(chapter.minDate, chapter.maxDate)}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {chapter.photoCount} {chapter.photoCount === 1 ? 'foto' : 'fotos'}
          {(chapter.recuerdoCount ?? 0) > 0 && (
            <> · {chapter.recuerdoCount} {chapter.recuerdoCount === 1 ? 'recuerdo' : 'recuerdos'}</>
          )}
        </p>
      </div>
    </Card>
  );
}
