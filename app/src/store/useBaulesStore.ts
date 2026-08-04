import { create } from 'zustand';
import { Baul, Chapter, Photo } from '@/types';
import { removePhotoFromAllCaches } from './baulesCacheReconciliation';

export interface BaulesState {
  baules: Baul[];
  chapters: Record<string, Chapter[]>;
  photos: Record<string, Photo[]>;
  loosePhotos: Record<string, Photo[]>;
  isLoading: boolean;

  reset: () => void;

  // Cross-store support for features/sharing/useCases.removePhoto: a removal request being
  // approved deletes a photo that may be cached under any chapter or as a loose photo here.
  removePhotoFromCaches: (photoId: string) => void;
}

// Actions live in features/{baules,chapters,photos}/useCases — this store only holds state,
// reset, and removePhotoFromCaches (a cross-store setter with no api call of its own, not a
// use case of any one feature). See docs/architecture/frontend.md for the ownership rule that
// splits a single shared store's actions across the features that call them.
export const useBaulesStore = create<BaulesState>((set) => ({
  baules: [],
  chapters: {},
  photos: {},
  loosePhotos: {},
  isLoading: true,

  reset: () => set({
    baules: [],
    chapters: {},
    photos: {},
    loosePhotos: {},
    isLoading: true,
  }),

  removePhotoFromCaches: (photoId) => set((state) => removePhotoFromAllCaches(state, photoId)),
}));
