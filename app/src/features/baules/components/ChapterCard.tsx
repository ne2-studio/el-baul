import React from 'react';
import { ImageIcon, MessageCircle } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { Chapter } from '@/types';
import { formatDateRange } from '@/app/utils/timeUtils';

interface ChapterCardProps {
  chapter: Chapter;
  onClick: () => void;
}

// Mismo lenguaje visual y tamaño que BaulCard (imagen a sangre + degradado, w-full h-52,
// título arriba a la izquierda, metadatos con icono abajo a la derecha) — ver ChapterCard en
// docs/DESIGN.md.
export function ChapterCard({ chapter, onClick }: ChapterCardProps) {
  return (
    <Button variant="plain"
      onClick={onClick}
      className="relative w-full h-52 rounded-2xl overflow-hidden text-left shadow-sm active:scale-[0.98] transition-transform"
    >
      {/* Background photo */}
      <div className="absolute inset-0 bg-secondary">
        {chapter.coverPhotoUrl ? (
          <img src={chapter.coverPhotoUrl} alt={chapter.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-16 h-16 text-muted-foreground opacity-40" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Gradient overlay — solid enough for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/20 to-black/75" />

      {/* Top-left: title + date range */}
      <div className="absolute top-4 left-4 right-4">
        <h3 className="font-serif text-white text-xl leading-tight drop-shadow line-clamp-2">
          {chapter.name}
        </h3>
        {chapter.minDate && chapter.maxDate && (
          <p className="text-white/90 text-xs mt-0.5 drop-shadow-sm">
            {formatDateRange(chapter.minDate, chapter.maxDate)}
          </p>
        )}
      </div>

      {/* Bottom-right: photo/recuerdo counts */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1 text-white/90 text-xs drop-shadow-sm">
          <ImageIcon className="w-3 h-3 -translate-y-px" />
          <span>{chapter.photoCount} {chapter.photoCount === 1 ? 'foto' : 'fotos'}</span>
        </div>
        {(chapter.recuerdoCount ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-white/90 text-xs drop-shadow-sm">
            <MessageCircle className="w-3 h-3 -translate-y-px" />
            <span>{chapter.recuerdoCount} {chapter.recuerdoCount === 1 ? 'recuerdo' : 'recuerdos'}</span>
          </div>
        )}
      </div>
    </Button>
  );
}
