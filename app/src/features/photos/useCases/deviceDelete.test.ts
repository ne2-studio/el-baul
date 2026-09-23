// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/photos/native/devicePhotos', async () => {
  const actual = await vi.importActual<typeof import('@/features/photos/native/devicePhotos')>('@/features/photos/native/devicePhotos');
  return { ...actual, DevicePhotos: { deletePhotos: vi.fn() } };
});

import { DevicePhoto, DevicePhotos, DeviceAlbum } from '@/features/photos/native/devicePhotos';
import { useDevicePhotosStore } from '@/store/useDevicePhotosStore';
import { useDeviceAlbumsStore } from '@/store/useDeviceAlbumsStore';
import { deleteDevicePhotos } from './index';

function photo(id: string, uri: string): DevicePhoto {
  return { id, thumbnailUrl: uri, fullUrl: uri, width: 100, height: 100 } as DevicePhoto;
}

function album(albumId: string, count: number, coverImageUrl: string): DeviceAlbum {
  return { albumId, displayName: 'Carpeta', count, coverImageUrl } as DeviceAlbum;
}

describe('deleteDevicePhotos', () => {
  beforeEach(() => {
    useDevicePhotosStore.getState().reset();
    useDeviceAlbumsStore.getState().reset();
    vi.clearAllMocks();
  });

  it('removes the deleted ids from useDevicePhotosStore and returns the native result', async () => {
    useDevicePhotosStore.setState({ photos: [photo('p1', '/p1.jpg'), photo('p2', '/p2.jpg')], loadedAlbumId: undefined });
    vi.mocked(DevicePhotos.deletePhotos).mockResolvedValue({ granted: true, deletedIds: ['p1'] });

    const result = await deleteDevicePhotos(['p1']);

    expect(DevicePhotos.deletePhotos).toHaveBeenCalledWith({ ids: ['p1'] });
    expect(result).toEqual({ granted: true, deletedIds: ['p1'] });
    expect(useDevicePhotosStore.getState().photos?.map((p) => p.id)).toEqual(['p2']);
  });

  it('leaves the store untouched when nothing was actually deleted (denied)', async () => {
    useDevicePhotosStore.setState({ photos: [photo('p1', '/p1.jpg')] });
    vi.mocked(DevicePhotos.deletePhotos).mockResolvedValue({ granted: false, deletedIds: [] });

    await deleteDevicePhotos(['p1']);

    expect(useDevicePhotosStore.getState().photos?.map((p) => p.id)).toEqual(['p1']);
  });

  it('decrements the loaded album count and recomputes its cover when the deleted photo was it', async () => {
    useDevicePhotosStore.setState({ photos: [photo('cover', '/cover.jpg'), photo('other', '/other.jpg')], loadedAlbumId: 'alb1' });
    useDeviceAlbumsStore.setState({ albums: [album('alb1', 2, '/cover.jpg')] });
    vi.mocked(DevicePhotos.deletePhotos).mockResolvedValue({ granted: true, deletedIds: ['cover'] });

    await deleteDevicePhotos(['cover']);

    const albums = useDeviceAlbumsStore.getState().albums;
    expect(albums).toHaveLength(1);
    expect(albums?.[0].count).toBe(1);
    expect(albums?.[0].coverImageUrl).toBe('/other.jpg');
  });

  it('removes the album entirely once its count reaches zero', async () => {
    useDevicePhotosStore.setState({ photos: [photo('p1', '/p1.jpg')], loadedAlbumId: 'alb1' });
    useDeviceAlbumsStore.setState({ albums: [album('alb1', 1, '/p1.jpg')] });
    vi.mocked(DevicePhotos.deletePhotos).mockResolvedValue({ granted: true, deletedIds: ['p1'] });

    await deleteDevicePhotos(['p1']);

    expect(useDeviceAlbumsStore.getState().albums).toEqual([]);
  });

  it('does not touch the cover when the deleted photo was not the album cover', async () => {
    useDevicePhotosStore.setState({ photos: [photo('cover', '/cover.jpg'), photo('other', '/other.jpg')], loadedAlbumId: 'alb1' });
    useDeviceAlbumsStore.setState({ albums: [album('alb1', 2, '/cover.jpg')] });
    vi.mocked(DevicePhotos.deletePhotos).mockResolvedValue({ granted: true, deletedIds: ['other'] });

    await deleteDevicePhotos(['other']);

    const albums = useDeviceAlbumsStore.getState().albums;
    expect(albums?.[0].coverImageUrl).toBe('/cover.jpg');
    expect(albums?.[0].count).toBe(1);
  });
});
