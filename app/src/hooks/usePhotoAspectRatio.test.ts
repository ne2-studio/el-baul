// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { photoStageHeight, PHOTO_STAGE_MAX_HEIGHT_DVH, PHOTO_STAGE_MIN_HEIGHT_DVH, usePhotoAspectRatio } from './usePhotoAspectRatio';

// jsdom never actually fetches/decodes images, so `new Image()` never fires a real `load`
// event — this stand-in fires it synchronously on assigning `src`, mimicking a same-tick
// cached load, so the hook's effect can be asserted without a real network/image stack.
class FakeImage {
  naturalWidth = 0;
  naturalHeight = 0;
  onload: (() => void) | null = null;
  #src = '';

  set src(value: string) {
    this.#src = value;
    const dims = FakeImage.dimensionsBySrc[value];
    if (dims) {
      this.naturalWidth = dims.width;
      this.naturalHeight = dims.height;
    }
    this.onload?.();
  }

  get src() {
    return this.#src;
  }

  static dimensionsBySrc: Record<string, { width: number; height: number }> = {};
}

describe('usePhotoAspectRatio', () => {
  const originalImage = global.Image;

  beforeEach(() => {
    // @ts-expect-error -- test double, not a full HTMLImageElement
    global.Image = FakeImage;
    FakeImage.dimensionsBySrc = {};
  });

  afterEach(() => {
    global.Image = originalImage;
  });

  it('resolves to width/height once the image loads', async () => {
    FakeImage.dimensionsBySrc['landscape.jpg'] = { width: 1200, height: 800 };

    const { result } = renderHook(() => usePhotoAspectRatio('landscape.jpg'));

    await waitFor(() => expect(result.current).toBe(1.5));
  });

  it('resets to undefined while a new src is loading', async () => {
    FakeImage.dimensionsBySrc['a.jpg'] = { width: 1200, height: 800 };
    FakeImage.dimensionsBySrc['b.jpg'] = { width: 800, height: 1200 };

    const { result, rerender } = renderHook(({ src }) => usePhotoAspectRatio(src), { initialProps: { src: 'a.jpg' } });
    await waitFor(() => expect(result.current).toBe(1.5));

    rerender({ src: 'b.jpg' });
    await waitFor(() => expect(result.current).toBeCloseTo(2 / 3));
  });
});

describe('photoStageHeight', () => {
  it('falls back to the max height while the ratio is unknown', () => {
    expect(photoStageHeight(undefined)).toBe(`${PHOTO_STAGE_MAX_HEIGHT_DVH}dvh`);
  });

  it('clamps a landscape photo to the min height instead of shrinking further', () => {
    // Very wide photo: 100vw / ratio would be well under the min, so the clamp's floor wins.
    expect(photoStageHeight(3)).toBe(`clamp(${PHOTO_STAGE_MIN_HEIGHT_DVH}dvh, calc(100vw / 3), ${PHOTO_STAGE_MAX_HEIGHT_DVH}dvh)`);
  });

  it('clamps a portrait photo to the max height instead of growing further', () => {
    // Tall photo: 100vw / ratio would be well over the max, so the clamp's ceiling wins.
    expect(photoStageHeight(0.5)).toBe(`clamp(${PHOTO_STAGE_MIN_HEIGHT_DVH}dvh, calc(100vw / 0.5), ${PHOTO_STAGE_MAX_HEIGHT_DVH}dvh)`);
  });
});
