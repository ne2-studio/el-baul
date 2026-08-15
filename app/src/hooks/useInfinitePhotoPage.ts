import { useCallback, useEffect, useRef, useState } from 'react';
import { Photo } from '@/types';
import { useLoadMoreSentinel } from '@/hooks/useLoadMoreSentinel';

const PAGE_SIZE = 60;

export type FetchPhotoPage = (skip: number, take: number) => Promise<{ photos: Photo[]; hasMore: boolean }>;

// Paginates through fetchPage, accumulating photos as the caller scrolls — the picker's own
// concern (skip cursor, in-flight guard, hasMore) is kept separate from how the page is
// actually fetched, which the caller supplies (baúl-wide vs. chapter-scoped vs. persona-scoped).
// Wires up useLoadMoreSentinel internally so every photo picker's "load more" trigger is the
// same IntersectionObserver, not a hand-rolled one per picker.
export function useInfinitePhotoPage(fetchPage: FetchPhotoPage) {
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
  }, [fetchPage, hasMore]);

  useEffect(() => {
    loadMore();
    // Only the first page loads automatically — subsequent pages come from the sentinel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // isInitialLoad as remountKey: the sentinel <div> is only rendered once the first page is
  // in, so the observer needs to (re-)attach once that happens — see useLoadMoreSentinel.
  const sentinelRef = useLoadMoreSentinel(loadMore, isInitialLoad);

  return { photos, hasMore, isLoading, isInitialLoad, loadMore, sentinelRef };
}
