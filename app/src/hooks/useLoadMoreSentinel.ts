import { useEffect, useRef } from 'react';

// Attaches an IntersectionObserver to the returned ref: whenever that element scrolls into
// view, calls loadMore(). Shared by any paginated list that loads its next page via a scroll
// sentinel instead of a "load more" button — CoverPhotoPickerModal (photo pages) and the baúl
// feed (recuerdo/photo-batch pages) — so the observer wiring itself isn't duplicated per list.
//
// remountKey re-subscribes the observer when it changes — needed because the sentinel <div> is
// typically only rendered once the first page is in (nothing to observe before then), so the
// ref's element identity changes independently of loadMore's.
export function useLoadMoreSentinel(loadMore: () => void, remountKey: unknown) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, remountKey]);

  return sentinelRef;
}
