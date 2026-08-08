import React from 'react';
import { MessageCircle } from 'lucide-react';
import { FeedItem, Photo, PhotoBatch, Recuerdo } from '@/types';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { LoadingSpinner } from '@/design-system/components/feedback/LoadingSpinner';
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

// El feed del baúl: recuerdos y tarjetas de lote de subida (una por UploadBatchId), mezclados
// y ordenados por el backend (ver BaulFeedManager) o, con el toggle apagado, solo recuerdos —
// ver BaulFeedTabContainer, el único caller que decide cuál de las dos fuentes usar.
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

  return (
    <div className="space-y-4">
      {feedItems.map((item) => (
        item.type === 'recuerdo' ? (
          <RecuerdoFeedCard
            key={item.recuerdo.id}
            recuerdo={item.recuerdo}
            onUserClick={onUserClick}
            onPhotoClick={() => onOpenPhoto?.(item.recuerdo.photoId!, item.recuerdo.chapterId)}
            onChapterClick={onOpenChapter}
            onShareRecuerdo={onShareRecuerdo}
            onEditRecuerdo={onEditRecuerdo}
          />
        ) : (
          <PhotoBatchCard
            key={item.photoBatch.batchId}
            photoBatch={item.photoBatch}
            onUserClick={onUserClick}
            onChapterClick={onOpenChapter}
            onOpenPhoto={(photo) => onOpenBatchPhoto?.(item.photoBatch, photo)}
            onOpenGrid={() => onOpenBatchGrid?.(item.photoBatch)}
          />
        )
      ))}

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
