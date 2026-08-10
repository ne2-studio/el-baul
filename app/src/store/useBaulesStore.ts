import { create } from 'zustand';
import { Baul, Chapter } from '@/types';

export interface BaulesState {
  baules: Baul[];
  chapters: Record<string, Chapter[]>;
  // Photo ids, not Photo objects — usePhotosStore.photosById is the canonical source for a
  // photo's own fields. Hydrate with hydratePhotos (see that store) wherever a component needs
  // the actual Photo[].
  photos: Record<string, string[]>;
  loosePhotos: Record<string, string[]>;
  // Keyed by UploadBatchId — a batch's own photo ids, for the feed card's grid/gallery
  // drill-down. See features/photos/useCases.loadPhotoBatchPhotos.
  photoBatchPhotos: Record<string, string[]>;
  isLoading: boolean;

  reset: () => void;
}

// Actions live in features/{baules,chapters,photos}/useCases — this store only holds state and
// reset. A photo's own fields are never patched here: deletePhoto/changePhotoDate/removePhoto
// write once to usePhotosStore instead, and every id-list here just stops resolving (delete) or
// picks up the new fields (update) the next time it's hydrated. See
// docs/architecture/frontend.md for the ownership rule that splits a single shared store's
// actions across the features that call them.
export const useBaulesStore = create<BaulesState>((set) => ({
  baules: [],
  chapters: {},
  photos: {},
  loosePhotos: {},
  photoBatchPhotos: {},
  isLoading: true,

  reset: () => set({
    baules: [],
    chapters: {},
    photos: {},
    loosePhotos: {},
    photoBatchPhotos: {},
    isLoading: true,
  }),
}));
