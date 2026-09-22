import { create } from 'zustand';
import { DeviceAlbum } from '@/features/photos/native/devicePhotos';

// "En este dispositivo"'s folders grid — sibling of useDevicePhotosStore, same
// undefined-vs-empty-array convention (not fetched yet vs fetched, empty).
export interface DeviceAlbumsState {
  albums: DeviceAlbum[] | undefined;

  reset: () => void;
  setAlbums: (albums: DeviceAlbum[]) => void;
}

export const useDeviceAlbumsStore = create<DeviceAlbumsState>((set) => ({
  albums: undefined,

  reset: () => set({ albums: undefined }),

  setAlbums: (albums) => set({ albums }),
}));
