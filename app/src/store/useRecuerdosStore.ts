import { create } from 'zustand';
import { FeedItem, Recuerdo } from '@/types';

export interface RecuerdosState {
  recuerdos: Record<string, Recuerdo[]>;
  chapterRecuerdos: Record<string, Recuerdo[]>;
  baulRecuerdos: Record<string, Recuerdo[]>;
  // Recuerdos + photo-upload-batch cards, merged and pre-sorted by the backend — only
  // populated while Features:BaulFeedEnabled is on (see BaulFeedTabContainer/loadBaulFeed).
  // baulRecuerdos above stays the source of truth while the toggle is off.
  baulFeed: Record<string, FeedItem[]>;

  reset: () => void;
}

// Actions live in features/memories/useCases — this store only holds state and its reset.
export const useRecuerdosStore = create<RecuerdosState>((set) => ({
  recuerdos: {},
  chapterRecuerdos: {},
  baulRecuerdos: {},
  baulFeed: {},

  reset: () => set({
    recuerdos: {},
    chapterRecuerdos: {},
    baulRecuerdos: {},
    baulFeed: {},
  }),
}));
