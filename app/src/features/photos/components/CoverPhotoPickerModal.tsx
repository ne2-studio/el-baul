import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ImageIcon } from 'lucide-react';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { LoadingSpinner } from '@/design-system/components/feedback/LoadingSpinner';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { Photo } from '@/types';

const PAGE_SIZE = 60;

interface CoverPhotoPickerModalProps {
  title: string;
  fetchPage: (skip: number, take: number) => Promise<{ photos: Photo[]; hasMore: boolean }>;
  onSelect: (photo: Photo) => void;
  onCancel: () => void;
}

// Paginates through fetchPage, accumulating photos as the caller scrolls — the picker's own
// concern (skip cursor, in-flight guard, hasMore) is kept separate from how the page is
// actually fetched, which the caller supplies (baúl-wide vs. chapter-scoped).
function useInfinitePhotoPage(fetchPage: CoverPhotoPickerModalProps['fetchPage']) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const skipRef = useRef(0);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setIsLoading(true);
    try {
      const page = await fetchPage(skipRef.current, PAGE_SIZE);
      skipRef.current += page.photos.length;
      setPhotos((prev) => [...prev, ...page.photos]);
      setHasMore(page.hasMore);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
      loadingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, hasMore]);

  useEffect(() => {
    loadMore();
    // Only the first page loads automatically — subsequent pages come from the sentinel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { photos, hasMore, isLoading, isInitialLoad, loadMore };
}

export function CoverPhotoPickerModal({ title, fetchPage, onSelect, onCancel }: CoverPhotoPickerModalProps) {
  const { photos, isLoading, isInitialLoad, loadMore } = useInfinitePhotoPage(fetchPage);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    });
    observer.observe(el);
    return () => observer.disconnect();
    // isInitialLoad is what makes the sentinel <div> exist in the DOM at all (it's only
    // rendered once the first page is in) — loadMore alone doesn't change identity between
    // pages that both have hasMore=true, so without this the observer would never attach.
  }, [loadMore, isInitialLoad]);

  const handleSelect = (photo: Photo) => {
    onSelect(photo);
    onCancel();
  };

  return (
    <BottomSheetModal onCancel={onCancel} size="lg">
      <div className="sticky top-0 -mx-6 -mt-6 px-6 pt-6 pb-4 bg-card z-10 flex items-center justify-between border-b border-border">
        <h2 className="text-xl font-serif text-foreground">{title}</h2>
        <button
          onClick={onCancel}
          aria-label="Cerrar"
          className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {isInitialLoad ? (
        <LoadingSpinner message="Cargando fotos..." />
      ) : photos.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="w-16 h-16" strokeWidth={1.5} />}
          title="Todavía no hay fotos aquí"
          subtitle="Añade fotos antes de elegir una portada"
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => handleSelect(photo)}
                className="aspect-square bg-secondary rounded-lg overflow-hidden hover:opacity-90 active:opacity-80 transition-opacity"
              >
                <img src={photo.thumbnailUrl} alt="Foto" className="w-full h-full object-cover" draggable={false} />
              </button>
            ))}
          </div>
          <div ref={sentinelRef} className="h-1" />
          {isLoading && <LoadingSpinner size="sm" />}
        </>
      )}
    </BottomSheetModal>
  );
}
