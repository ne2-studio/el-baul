import { useEffect, useState } from 'react';

/**
 * Loads a photo off-screen just to read its natural width/height, so a caller can size a
 * container to the photo's real proportions instead of guessing. `Photo` (types/index.ts)
 * doesn't carry width/height from the backend, and the <img> that actually gets shown on
 * screen is often rendered with object-contain inside an absolutely positioned wrapper (see
 * PhotoStage) — its box tells us nothing about the source image's real aspect ratio.
 *
 * Returns undefined while unknown (not yet loaded, or failed to load) — callers should treat
 * that as "assume portrait" so the layout doesn't jump once the real ratio arrives.
 */
export function usePhotoAspectRatio(src: string): number | undefined {
  const [ratio, setRatio] = useState<number | undefined>(undefined);

  useEffect(() => {
    setRatio(undefined);
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled && img.naturalWidth && img.naturalHeight) {
        setRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return ratio;
}

/** Min/max, in dvh, of the height a photo-preview panel sized via {@link usePhotoAspectRatio}
 * may take — see photoStageHeight. */
export const PHOTO_STAGE_MIN_HEIGHT_DVH = 28;
export const PHOTO_STAGE_MAX_HEIGHT_DVH = 42;

/**
 * CSS height for a full-width photo panel that should hug the photo's real aspect ratio
 * instead of using a fixed height: `100vw / ratio` gives the height a full-bleed object-contain
 * image would need to fill the width with no letterboxing, clamped so landscape photos don't
 * shrink the panel too much and portrait photos don't grow it past what leaves room for the
 * content below (e.g. a persona list's radio buttons).
 */
export function photoStageHeight(ratio: number | undefined): string {
  if (ratio === undefined) return `${PHOTO_STAGE_MAX_HEIGHT_DVH}dvh`;
  return `clamp(${PHOTO_STAGE_MIN_HEIGHT_DVH}dvh, calc(100vw / ${ratio}), ${PHOTO_STAGE_MAX_HEIGHT_DVH}dvh)`;
}
