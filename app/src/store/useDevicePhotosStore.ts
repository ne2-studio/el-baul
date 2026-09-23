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
  // Which album (undefined = the flat list) `photos` was fetched for. Lets a fresh mount of
  // DevicePhotoGalleryContainer for a different album tell "stale photos from another album"
  // apart from "already-loaded photos for this album" without relying on component lifecycle,
  // since the store outlives individual mounts (back to the folder grid, then into another album).
  loadedAlbumId?: string;

  reset: () => void;
  setPermission: (permission: DevicePhotosPermission) => void;
  setPage: (photos: DevicePhoto[], hasMore: boolean, nextCursor?: string, albumId?: string) => void;
  appendPage: (photos: DevicePhoto[], hasMore: boolean, nextCursor?: string) => void;
  /** "Borrar de este dispositivo" (GitHub issue #86) — there's no server round trip to refresh
   * from once photos are actually deleted from MediaStore, so the use case that just deleted
   * them removes them from this cache itself. */
  removePhotos: (ids: string[]) => void;
}

export const useDevicePhotosStore = create<DevicePhotosState>((set) => ({
  permission: 'unknown',
  photos: undefined,
  hasMore: true,
  nextCursor: undefined,
  loadedAlbumId: undefined,

  reset: () => set({ permission: 'unknown', photos: undefined, hasMore: true, nextCursor: undefined, loadedAlbumId: undefined }),

  setPermission: (permission) => set({ permission }),

  setPage: (photos, hasMore, nextCursor, albumId) => set({ photos, hasMore, nextCursor, loadedAlbumId: albumId }),

  appendPage: (photos, hasMore, nextCursor) => set((state) => ({
    photos: [...(state.photos ?? []), ...photos],
    hasMore,
    nextCursor,
  })),

  removePhotos: (ids) => set((state) => ({
    photos: state.photos?.filter((photo) => !ids.includes(photo.id)),
  })),
}));
