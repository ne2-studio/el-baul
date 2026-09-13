import { create } from 'zustand';
import { BaulAppearance, PhotoAsset } from '@/types';

// State for the user-scoped "Mis fotos" screen — deliberately not keyed by baulId (there is
// none): a single accumulated list, same infinite-scroll shape as
// useBaulesStore.baulPhotos/baulPhotosHasMore. Actions live in
// features/photos/useCases/loading.ts, same ownership rule as every other photo store.
export interface MyPhotosState {
  // undefined = not fetched yet (first load in flight/pending); [] = fetched, empty.
  assets: PhotoAsset[] | undefined;
  hasMore: boolean;

  reset: () => void;

  // Patches one asset's "Aparece en" list after "Añadir a otro baúl" (docs/.backlog issue #62,
  // Slice 2 — Mis fotos wiring) — a no-op if the appearance is already there, mirroring the
  // backend's own idempotency instead of trusting the caller never to double-add.
  addBaulAppearance: (assetId: string, appearance: BaulAppearance) => void;
}

export const useMyPhotosStore = create<MyPhotosState>((set) => ({
  assets: undefined,
  hasMore: true,

  reset: () => set({ assets: undefined, hasMore: true }),

  addBaulAppearance: (assetId, appearance) => set((state) => ({
    assets: state.assets?.map((asset) => {
      if (asset.id !== assetId || asset.baules.some((b) => b.baulId === appearance.baulId)) return asset;
      return { ...asset, baules: [...asset.baules, appearance] };
    }),
  })),
}));
