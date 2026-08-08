import { create } from 'zustand';
import { FeedItem, Recuerdo } from '@/types';

export interface RecuerdosState {
  recuerdos: Record<string, Recuerdo[]>;
  chapterRecuerdos: Record<string, Recuerdo[]>;
  baulRecuerdos: Record<string, Recuerdo[]>;
  // Recuerdos + photo-upload-batch cards, merged and pre-sorted by the backend — only
  // populated while Features:BaulFeedEnabled is on (see BaulFeedTabContainer/loadBaulFeed).
  // baulRecuerdos above stays the source of truth while the toggle is off. Accumulates pages
  // as the feed tab scrolls (see loadMoreBaulFeed) — never re-fetched from scratch except by
  // loadBaulFeed itself (first page).
  baulFeed: Record<string, FeedItem[]>;
  // Whether another page remains beyond what's currently in baulFeed[baulId] — drives the
  // feed tab's scroll sentinel. Absent (undefined) before the first page has loaded.
  baulFeedHasMore: Record<string, boolean>;

  reset: () => void;
}

// Actions live in features/memories/useCases — this store only holds state and its reset.
export const useRecuerdosStore = create<RecuerdosState>((set) => ({
  recuerdos: {},
  chapterRecuerdos: {},
  baulRecuerdos: {},
  baulFeed: {},
  baulFeedHasMore: {},

  reset: () => set({
    recuerdos: {},
    chapterRecuerdos: {},
    baulRecuerdos: {},
    baulFeed: {},
    baulFeedHasMore: {},
  }),
}));
