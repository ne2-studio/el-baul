import { beforeEach, describe, expect, it } from 'vitest';
import { PhotoAsset } from '@/types';
import { useMyPhotosStore } from './useMyPhotosStore';

function asset(id: string, baules: { baulId: string; baulName: string }[] = []): PhotoAsset {
  return { id, thumbnailUrl: `/${id}-thumb.jpg`, fullUrl: `/${id}.jpg`, width: 100, height: 100, baules } as PhotoAsset;
}

describe('useMyPhotosStore addBaulAppearance', () => {
  beforeEach(() => {
    useMyPhotosStore.getState().reset();
  });

  // Reported bug (GitHub issue #80): on "Sin compartir", adding a photo to a baúl must make it
  // disappear immediately from the loaded list — it's no longer unshared — mirroring how
  // removeAssets drops it for "Quitar de Mis fotos".
  it('drops the asset from the loaded list when the active filter is "sin-compartir"', () => {
    useMyPhotosStore.setState({ filter: 'sin-compartir', assets: [asset('a1'), asset('a2')], hasMore: false });

    useMyPhotosStore.getState().addBaulAppearance('a1', { baulId: 'b1', baulName: 'Familia Pardal' });

    expect(useMyPhotosStore.getState().assets?.map((a) => a.id)).toEqual(['a2']);
  });

  it('merges the appearance in place when the active filter is "todas"', () => {
    useMyPhotosStore.setState({ filter: 'todas', assets: [asset('a1'), asset('a2')], hasMore: false });

    useMyPhotosStore.getState().addBaulAppearance('a1', { baulId: 'b1', baulName: 'Familia Pardal' });

    expect(useMyPhotosStore.getState().assets).toEqual([
      asset('a1', [{ baulId: 'b1', baulName: 'Familia Pardal' }]),
      asset('a2'),
    ]);
  });

  it('is a no-op when the asset already has that appearance', () => {
    useMyPhotosStore.setState({
      filter: 'todas',
      assets: [asset('a1', [{ baulId: 'b1', baulName: 'Familia Pardal' }])],
      hasMore: false,
    });

    useMyPhotosStore.getState().addBaulAppearance('a1', { baulId: 'b1', baulName: 'Familia Pardal' });

    expect(useMyPhotosStore.getState().assets).toEqual([asset('a1', [{ baulId: 'b1', baulName: 'Familia Pardal' }])]);
  });
});
