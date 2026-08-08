import React from 'react';
import { PhotoBatch, Photo } from '@/types';
import { Button } from '@/design-system/components/actions/Button';
import { ChapterBadge } from '@/design-system/components/data-display/Badges';
import { FeedCardHeader } from '@/design-system/components/data-display/FeedCardHeader';

interface PhotoBatchCardProps {
  photoBatch: PhotoBatch;
  onUserClick?: (personaId: string) => void;
  onChapterClick?: (chapterId: string) => void;
  /** Opens the gallery directly on that photo, scoped to this batch. */
  onOpenPhoto: (photo: Photo) => void;
  /** Opens this batch's own photo grid — only reachable when there are more photos than the
   * collage shows. */
  onOpenGrid: () => void;
}

// Feed card for one photo-upload batch (every photo sharing the same UploadBatchId — see
// IPhotoUploadBatchReadModel on the backend). Mirrors RecuerdoFeedCard's shape (same
// FeedCardHeader, same card chrome) but its body is a photo collage instead of recuerdo text.
export function PhotoBatchCard({ photoBatch, onUserClick, onChapterClick, onOpenPhoto, onOpenGrid }: PhotoBatchCardProps) {
  const canOpenPersona = !!(photoBatch.personaId && onUserClick);
  const remaining = photoBatch.photoCount - photoBatch.previewPhotos.length;

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5">
      <FeedCardHeader
        name={photoBatch.userName}
        avatarUrl={photoBatch.userAvatar}
        actionText={`subió ${photoBatch.photoCount} ${photoBatch.photoCount === 1 ? 'foto' : 'fotos'}`}
        timestamp={photoBatch.createdAt}
        onAvatarClick={canOpenPersona ? () => onUserClick!(photoBatch.personaId!) : undefined}
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        {photoBatch.previewPhotos.map((photo) => (
          <Button variant="plain"
            key={photo.id}
            type="button"
            aria-label="Ver foto"
            onClick={() => onOpenPhoto(photo)}
            className="aspect-square rounded-xl overflow-hidden hover:opacity-90 transition-opacity"
          >
            <img src={photo.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          </Button>
        ))}
      </div>

      {remaining > 0 && (
        <Button variant="plain"
          type="button"
          onClick={onOpenGrid}
          className="mt-2 w-full text-center text-sm font-medium text-primary bg-secondary rounded-xl px-3 py-2 hover:bg-secondary/80 transition-colors"
        >
          y {remaining} más
        </Button>
      )}

      {photoBatch.chapterId && (
        <ChapterBadge
          chapterName={photoBatch.chapterName}
          onClick={() => onChapterClick?.(photoBatch.chapterId!)}
          className="mt-3"
        />
      )}
    </div>
  );
}
