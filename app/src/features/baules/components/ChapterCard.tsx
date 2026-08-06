import React from 'react';
import { ImageIcon } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { Chapter } from '@/types';
import { formatDateRange } from '@/app/utils/timeUtils';

interface ChapterCardProps {
  chapter: Chapter;
  onClick: () => void;
}

// Mismo lenguaje visual que BaulCard (imagen a sangre + degradado + título superpuesto): los
// capítulos son ahora el elemento visual principal de la app — ver el PRD "Baúl como
// Workspace".
export function ChapterCard({ chapter, onClick }: ChapterCardProps) {
  return (
    <Button variant="plain"
      onClick={onClick}
      className="relative w-full aspect-square rounded-2xl overflow-hidden text-left shadow-sm active:scale-[0.98] transition-transform"
    >
      {/* Background photo */}
      <div className="absolute inset-0 bg-secondary">
        {chapter.coverPhotoUrl ? (
          <img src={chapter.coverPhotoUrl} alt={chapter.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground opacity-40" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Gradient overlay — solid enough for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/10 to-black/70" />

      {/* Top-left: title + date range */}
      <div className="absolute top-3 left-3 right-3">
        <h3 className="font-serif text-white text-lg leading-tight drop-shadow line-clamp-2">
          {chapter.name}
        </h3>
        {chapter.minDate && chapter.maxDate && (
          <p className="text-white/90 text-xs mt-0.5 drop-shadow-sm">
            {formatDateRange(chapter.minDate, chapter.maxDate)}
          </p>
        )}
      </div>

      {/* Bottom-left: photo/recuerdo counts */}
      <div className="absolute bottom-3 left-3 right-3">
        <p className="text-white/85 text-xs drop-shadow-sm">
          {chapter.photoCount} {chapter.photoCount === 1 ? 'foto' : 'fotos'}
          {(chapter.recuerdoCount ?? 0) > 0 && (
            <> · {chapter.recuerdoCount} {chapter.recuerdoCount === 1 ? 'recuerdo' : 'recuerdos'}</>
          )}
        </p>
      </div>
    </Button>
  );
}
