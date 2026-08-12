import React from 'react';
import { PhotoCrop } from '@/types';

export const DEFAULT_PHOTO_CROP: PhotoCrop = { x: 0.5, y: 0.5, scale: 1 };

// Turns a focal point + zoom into the CSS that previews it: objectPosition centers the crop's
// focal point in the box, transform/transformOrigin zoom around that same point. The actual
// resampling happens server-side (imgproxy, via ImageCrop — see
// docs/architecture/infrastructure.md), so this is only ever a preview, never applied to pixels.
export function photoCropStyle(crop: PhotoCrop): React.CSSProperties {
  const x = `${crop.x * 100}%`;
  const y = `${crop.y * 100}%`;
  return {
    objectPosition: `${x} ${y}`,
    transform: `scale(${crop.scale})`,
    transformOrigin: `${x} ${y}`,
  };
}

interface PhotoCropStepProps {
  src: string;
  alt: string;
  crop: PhotoCrop;
  onChange: (crop: PhotoCrop) => void;
  /** 'circle' for avatars, 'rect' (with aspectRatio) for covers. */
  shape: 'circle' | 'rect';
  /** Required when shape is 'rect' — the placement's real target ratio (width / height). */
  aspectRatio?: number;
}

// The zoom + horizontal/vertical focal-point step shared by every photo picker that stores a
// crop (persona avatar, chapter cover, baúl cover) — one place for the preview box and the three
// sliders so the three pickers can't drift out of sync with each other.
export function PhotoCropStep({ src, alt, crop, onChange, shape, aspectRatio }: PhotoCropStepProps) {
  return (
    <div className="space-y-4">
      <div
        className={
          shape === 'circle'
            ? 'mx-auto aspect-square w-56 max-w-full overflow-hidden rounded-full bg-secondary'
            : 'w-full overflow-hidden rounded-2xl bg-secondary'
        }
        style={shape === 'rect' ? { aspectRatio } : undefined}
      >
        <img src={src} alt={alt} className="h-full w-full object-cover" style={photoCropStyle(crop)} draggable={false} />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Zoom
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={crop.scale}
            onChange={(event) => onChange({ ...crop, scale: Number(event.target.value) })}
            className="mt-2 w-full accent-primary"
          />
        </label>
        <label className="block text-sm font-medium text-foreground">
          Horizontal
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={crop.x}
            onChange={(event) => onChange({ ...crop, x: Number(event.target.value) })}
            className="mt-2 w-full accent-primary"
          />
        </label>
        <label className="block text-sm font-medium text-foreground">
          Vertical
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={crop.y}
            onChange={(event) => onChange({ ...crop, y: Number(event.target.value) })}
            className="mt-2 w-full accent-primary"
          />
        </label>
      </div>
    </div>
  );
}
