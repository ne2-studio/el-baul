import { create } from 'zustand';
import { DeviceAlbum } from '@/features/photos/native/devicePhotos';

// "En este dispositivo"'s folders grid — sibling of useDevicePhotosStore, same
// undefined-vs-empty-array convention (not fetched yet vs fetched, empty).
export interface DeviceAlbumsState {
  albums: DeviceAlbum[] | undefined;

  reset: () => void;
  setAlbums: (albums: DeviceAlbum[]) => void;
  /** "Borrar de este dispositivo" (GitHub issue #86) — there's no server round trip to refresh
   * an album's count/cover from once photos are deleted from it, so the use case that just
   * deleted them patches this pure client-side MediaStore projection directly. Removes the album
   * entirely once its count reaches zero, same as an empty folder disappearing from the device's
   * own gallery. `newCoverImageUrl` is omitted when the deleted photo(s) weren't the album's
   * cover, in which case the existing cover is left untouched. */
  applyPhotoDeletion: (albumId: string, deletedCount: number, newCoverImageUrl?: string) => void;
}

export const useDeviceAlbumsStore = create<DeviceAlbumsState>((set) => ({
  albums: undefined,

  reset: () => set({ albums: undefined }),

  setAlbums: (albums) => set({ albums }),

  applyPhotoDeletion: (albumId, deletedCount, newCoverImageUrl) =>
    set((state) => ({
      albums: state.albums
        ?.map((album) =>
          album.albumId === albumId
            ? Object.assign(Object.create(Object.getPrototypeOf(album)) as DeviceAlbum, album, {
                count: album.count - deletedCount,
                coverImageUrl: newCoverImageUrl ?? album.coverImageUrl,
              })
            : album
        )
        .filter((album) => album.count > 0),
    })),
}));
