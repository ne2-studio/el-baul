import React from 'react';
import { MessageCircle } from 'lucide-react';
import { FeedItem, Photo, PhotoBatch, Recuerdo } from '@/types';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { LoadingSpinner } from '@/design-system/components/feedback/LoadingSpinner';
import { ChapterCreatedFeedCard } from '@/features/memories/components/ChapterCreatedFeedCard';
import { RecuerdoFeedCard } from '@/features/memories/components/RecuerdoFeedCard';
import { PhotoBatchCard } from '@/features/photos/components/PhotoBatchCard';
import { useLoadMoreSentinel } from '@/hooks/useLoadMoreSentinel';

interface FeedTabProps {
  feedItems: FeedItem[];
  onOpenChapter?: (chapterId: string) => void;
  onOpenPhoto?: (photoId: string, chapterId?: string) => void;
  onUserClick?: (personaId: string) => void;
  onShareRecuerdo?: (recuerdo: Recuerdo) => void;
  onEditRecuerdo?: (recuerdo: Recuerdo, text: string) => Promise<boolean> | boolean | void;
  /** Abre la galería directamente en esa foto, acotada al lote. Solo hace falta cuando el
   * feed incluye tarjetas de subida (toggle Features:BaulFeedEnabled activo). */
  onOpenBatchPhoto?: (batch: PhotoBatch, photo: Photo) => void;
  /** Abre la grid propia del lote — solo alcanzable cuando hay más fotos que las del collage. */
  onOpenBatchGrid?: (batch: PhotoBatch) => void;
  /** Scroll infinito: si se pasa, se pinta un sentinel al final de la lista que dispara esta
   * función al entrar en el viewport, mientras hasMore sea true — solo tiene sentido con el
   * toggle activo, ya que la ruta antigua (recuerdos sin paginar) no pasa estas props. */
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

function renderFeedItem(
  item: FeedItem,
  { onOpenChapter, onOpenPhoto, onUserClick, onShareRecuerdo, onEditRecuerdo, onOpenBatchPhoto, onOpenBatchGrid }:
    Pick<FeedTabProps, 'onOpenChapter' | 'onOpenPhoto' | 'onUserClick' | 'onShareRecuerdo' | 'onEditRecuerdo' | 'onOpenBatchPhoto' | 'onOpenBatchGrid'>,
) {
  switch (item.type) {
    case 'recuerdo':
      return (
        <RecuerdoFeedCard
          key={item.recuerdo.id}
          recuerdo={item.recuerdo}
          isNew={item.isNew}
          onUserClick={onUserClick}
          onPhotoClick={() => onOpenPhoto?.(item.recuerdo.photoId!, item.recuerdo.chapterId)}
          onChapterClick={onOpenChapter}
          onShareRecuerdo={onShareRecuerdo}
          onEditRecuerdo={onEditRecuerdo}
        />
      );
    case 'photo_batch':
      return (
        <PhotoBatchCard
          key={item.photoBatch.batchId}
          photoBatch={item.photoBatch}
          isNew={item.isNew}
          onUserClick={onUserClick}
          onChapterClick={onOpenChapter}
          onOpenPhoto={(photo) => onOpenBatchPhoto?.(item.photoBatch, photo)}
          onOpenGrid={() => onOpenBatchGrid?.(item.photoBatch)}
        />
      );
    case 'chapter_created':
      return (
        <ChapterCreatedFeedCard
          key={item.chapterCreated.chapterId}
          chapter={item.chapterCreated}
          isNew={item.isNew}
          onUserClick={onUserClick}
          onOpenChapter={onOpenChapter}
        />
      );
  }
}

// El feed del baúl: recuerdos, tarjetas de lote de subida (una por UploadBatchId) y tarjetas de
// capítulo creado, mezclados y ordenados por el backend (ver BaulFeedManager) o, con el toggle
// apagado, solo recuerdos — ver BaulFeedTabContainer, el único caller que decide cuál de las dos
// fuentes usar. Los items marcados isNew (actividad desde la última visita — ver
// BaulFeedManager.GetFeedAsync) siempre llegan primero y contiguos, así que basta con partir la
// lista en el primer item ya visto para separar las dos swimlanes.
export function FeedTab({
  feedItems, onOpenChapter, onOpenPhoto, onUserClick, onShareRecuerdo, onEditRecuerdo, onOpenBatchPhoto, onOpenBatchGrid,
  onLoadMore, hasMore = false, isLoadingMore = false,
}: FeedTabProps) {
  // Called unconditionally (rules of hooks) even when pagination isn't wired up — the sentinel
  // <div> below only renders when onLoadMore/hasMore say so, and the hook is a no-op without a
  // DOM node attached to its ref.
  const sentinelRef = useLoadMoreSentinel(onLoadMore ?? (() => {}), feedItems.length);

  if (feedItems.length === 0) {
    return (
      <EmptyState
        icon={<MessageCircle className="w-20 h-20" strokeWidth={1.5} />}
        title="Todavía no hay recuerdos"
        subtitle="Añade el primero desde el botón de abajo"
      />
    );
  }

  const firstSeenIndex = feedItems.findIndex((item) => !item.isNew);
  const newItems = firstSeenIndex === -1 ? feedItems : feedItems.slice(0, firstSeenIndex);
  const seenItems = firstSeenIndex === -1 ? [] : feedItems.slice(firstSeenIndex);
  const handlers = { onOpenChapter, onOpenPhoto, onUserClick, onShareRecuerdo, onEditRecuerdo, onOpenBatchPhoto, onOpenBatchGrid };

  return (
    <div className="space-y-4">
      {newItems.length > 0 && (
        <p className="px-1 text-xs font-medium uppercase tracking-wide text-primary">Nueva actividad</p>
      )}
      {newItems.map((item) => renderFeedItem(item, handlers))}

      {newItems.length > 0 && seenItems.length > 0 && (
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-border" />
          <p className="text-xs text-muted-foreground">Ya estás al día</p>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}
      {seenItems.map((item) => renderFeedItem(item, handlers))}

      {onLoadMore && hasMore && (
        <>
          <div ref={sentinelRef} className="h-1" />
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
