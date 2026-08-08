import { create } from 'zustand';
import { Baul, Chapter, Photo } from '@/types';
import { removePhotoFromAllCaches, updatePhotoInAllCaches } from './baulesCacheReconciliation';

export interface BaulesState {
  baules: Baul[];
  chapters: Record<string, Chapter[]>;
  photos: Record<string, Photo[]>;
  loosePhotos: Record<string, Photo[]>;
  // Keyed by UploadBatchId — a batch's own photos, for the feed card's grid/gallery drill-down.
  // See features/photos/useCases.loadPhotoBatchPhotos.
  photoBatchPhotos: Record<string, Photo[]>;
  isLoading: boolean;

  reset: () => void;

  // Cross-store support for features/sharing/useCases.removePhoto: a removal request being
  // approved deletes a photo that may be cached under any chapter or as a loose photo here.
  removePhotoFromCaches: (photoId: string) => void;

  // Cross-store support for features/photos/useCases (deletePhoto, changePhotoDate): either
  // photo viewer can trigger these without knowing which chapter/loose slice the photo is
  // cached under, so this patches it wherever it's found.
  updatePhotoInCaches: (photo: Photo) => void;
}

// Actions live in features/{baules,chapters,photos}/useCases — this store only holds state,
// reset, and removePhotoFromCaches/updatePhotoInCaches (cross-store setters with no api call
// of their own, not a use case of any one feature). See docs/architecture/frontend.md for the
// ownership rule that splits a single shared store's actions across the features that call
// them.
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

  removePhotoFromCaches: (photoId) => set((state) => removePhotoFromAllCaches(state, photoId)),
  updatePhotoInCaches: (photo) => set((state) => updatePhotoInAllCaches(state, photo)),
}));
