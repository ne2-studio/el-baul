import { create } from 'zustand';
import { BaulAppearance, PhotoAsset } from '@/types';

export type MyPhotosFilter = 'todas' | 'sin-compartir';

// State for the user-scoped "Mis fotos" screen — deliberately not keyed by baulId (there is
// none): a single accumulated list, same infinite-scroll shape as
// useBaulesStore.baulPhotos/baulPhotosHasMore. Actions live in
// features/photos/useCases/loading.ts, same ownership rule as every other photo store.
//
// Only one filter's page is ever cached at a time (Slice 3, docs/.backlog issue #62): switching
// filter clears assets/hasMore and starts a fresh paginated load, same as BaulPhotosTabContainer
// re-fetching "Todas" — there's no need to hold both lists in memory for a screen the user
// looks at one filter of at a time.
export interface MyPhotosState {
  filter: MyPhotosFilter;
  // undefined = not fetched yet (first load in flight/pending); [] = fetched, empty.
  assets: PhotoAsset[] | undefined;
  hasMore: boolean;

  reset: () => void;
  setFilter: (filter: MyPhotosFilter) => void;
  setPage: (assets: PhotoAsset[], hasMore: boolean) => void;
  appendPage: (assets: PhotoAsset[], hasMore: boolean) => void;

  // Prepends freshly-ingested assets from a direct Mis fotos upload (Slice 3) onto whichever
  // filter is currently loaded — see uploadToMyPhotos, the only caller, which only passes
  // assets eligible for the active filter (an asset already shared to a baúl is never passed
  // while "Sin compartir" is active).
  prependUploaded: (assets: PhotoAsset[]) => void;

  // Patches one asset's "Aparece en" list after "Añadir a otro baúl" (docs/.backlog issue #62,
  // Slice 2 — Mis fotos wiring) — a no-op if the appearance is already there, mirroring the
  // backend's own idempotency instead of trusting the caller never to double-add.
  addBaulAppearance: (assetId: string, appearance: BaulAppearance) => void;
}

export const useMyPhotosStore = create<MyPhotosState>((set) => ({
  filter: 'todas',
  assets: undefined,
  hasMore: true,

  reset: () => set({ filter: 'todas', assets: undefined, hasMore: true }),

  setFilter: (filter) => set({ filter, assets: undefined, hasMore: true }),

  setPage: (assets, hasMore) => set({ assets, hasMore }),

  appendPage: (assets, hasMore) => set((state) => ({ assets: [...(state.assets ?? []), ...assets], hasMore })),

  prependUploaded: (assets) => set((state) => (state.assets === undefined ? state : { assets: [...assets, ...state.assets] })),

  addBaulAppearance: (assetId, appearance) => set((state) => ({
    assets: state.assets?.map((asset) => {
      if (asset.id !== assetId || asset.baules.some((b) => b.baulId === appearance.baulId)) return asset;
      return { ...asset, baules: [...asset.baules, appearance] };
    }),
  })),
}));
