import { create } from 'zustand';
import { PhotoAsset } from '@/types';

// State for the user-scoped "Mis fotos" screen — deliberately not keyed by baulId (there is
// none): a single accumulated list, same infinite-scroll shape as
// useBaulesStore.baulPhotos/baulPhotosHasMore. Actions live in
// features/photos/useCases/loading.ts, same ownership rule as every other photo store.
export interface MyPhotosState {
  // undefined = not fetched yet (first load in flight/pending); [] = fetched, empty.
  assets: PhotoAsset[] | undefined;
  hasMore: boolean;

  reset: () => void;
}

export const useMyPhotosStore = create<MyPhotosState>((set) => ({
  assets: undefined,
  hasMore: true,

  reset: () => set({ assets: undefined, hasMore: true }),
}));
