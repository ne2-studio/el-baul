import { create } from 'zustand';
import { DevicePhoto } from '@/features/photos/native/devicePhotos';

export type DevicePhotosPermission = 'unknown' | 'granted' | 'denied';

// State for "En este dispositivo" — same accumulated-list shape as useMyPhotosStore, but backed
// by the native MediaStore bridge instead of the API (see features/photos/useCases/loading.ts).
// nextCursor is stored explicitly (rather than derived from photos.length, unlike
// loadMoreMyPhotos) since it's an opaque cursor handed back by the native side, not necessarily
// a plain offset — see DevicePhotos.getPhotos.
export interface DevicePhotosState {
  permission: DevicePhotosPermission;
  // undefined = not fetched yet (first load in flight/pending); [] = fetched, empty.
  photos: DevicePhoto[] | undefined;
  hasMore: boolean;
  nextCursor?: string;

  reset: () => void;
  setPermission: (permission: DevicePhotosPermission) => void;
  setPage: (photos: DevicePhoto[], hasMore: boolean, nextCursor?: string) => void;
  appendPage: (photos: DevicePhoto[], hasMore: boolean, nextCursor?: string) => void;
}

export const useDevicePhotosStore = create<DevicePhotosState>((set) => ({
  permission: 'unknown',
  photos: undefined,
  hasMore: true,
  nextCursor: undefined,

  reset: () => set({ permission: 'unknown', photos: undefined, hasMore: true, nextCursor: undefined }),

  setPermission: (permission) => set({ permission }),

  setPage: (photos, hasMore, nextCursor) => set({ photos, hasMore, nextCursor }),

  appendPage: (photos, hasMore, nextCursor) => set((state) => ({
    photos: [...(state.photos ?? []), ...photos],
    hasMore,
    nextCursor,
  })),
}));
