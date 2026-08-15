import { useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { Button } from '@/design-system/components/actions/Button';
import { DEFAULT_PHOTO_CROP, PhotoCropStep } from '@/design-system/patterns/media/PhotoCropStep';
import { PhotoCrop } from '@/types';

interface PickThenCropModalProps<TSource> {
  onCancel: () => void;
  /** Title shown while picking. */
  pickTitle: React.ReactNode;
  /** Title shown once a source has been chosen and cropping is underway. */
  cropTitle: string;
  /** Extra classes for the pick-step's wrapping div, alongside the default step-in animation. */
  pickClassName?: string;
  /** The pick-step content — receives `choose` to call once the caller has a source to crop. */
  renderPick: (choose: (source: TSource) => void) => React.ReactNode;
  /** The image URL to crop, given the chosen source. */
  cropSrc: (source: TSource) => string;
  shape: 'circle' | 'rect';
  aspectRatio?: number;
  /** The crop-step's footer (typically a save button) — receives the chosen source and crop. */
  renderCropFooter: (source: TSource, crop: PhotoCrop) => React.ReactNode;
}

// The "pick a photo, then crop it" shell shared by every photo picker that stores a crop
// (chapter/baúl cover, persona avatar): the back/close header chrome, the pick↔crop step state
// machine, and the DEFAULT_PHOTO_CROP reset on each new pick are identical across pickers — only
// the pick step's own content (a plain grid vs. tagged/untagged swimlanes + upload affordance)
// and the crop shape/aspect ratio actually differ, so those stay as props/children instead of
// being forced into one shared grid.
export function PickThenCropModal<TSource>({
  onCancel,
  pickTitle,
  cropTitle,
  pickClassName = '',
  renderPick,
  cropSrc,
  shape,
  aspectRatio,
  renderCropFooter,
}: PickThenCropModalProps<TSource>) {
  const [source, setSource] = useState<TSource | null>(null);
  const [crop, setCrop] = useState<PhotoCrop>(DEFAULT_PHOTO_CROP);
  const step: 'pick' | 'crop' = source ? 'crop' : 'pick';

  const choose = (chosen: TSource) => {
    setSource(chosen);
    setCrop(DEFAULT_PHOTO_CROP);
  };

  const back = () => setSource(null);

  return (
    <BottomSheetModal
      onCancel={onCancel}
      size="lg"
      header={
        step === 'crop' && source ? (
          <>
            <div className="flex items-center gap-1 min-w-0">
              <Button
                variant="plain"
                onClick={back}
                aria-label="Volver"
                className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-serif text-foreground truncate">{cropTitle}</h2>
            </div>
            <Button
              variant="plain"
              onClick={onCancel}
              aria-label="Cerrar"
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-serif text-foreground">{pickTitle}</h2>
            <Button
              variant="plain"
              onClick={onCancel}
              aria-label="Cerrar"
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </Button>
          </>
        )
      }
    >
      {step === 'crop' && source ? (
        <div key="crop" className="space-y-4 animate-step-in">
          <PhotoCropStep src={cropSrc(source)} alt="" crop={crop} onChange={setCrop} shape={shape} aspectRatio={aspectRatio} />
          {renderCropFooter(source, crop)}
        </div>
      ) : (
        <div key="pick" className={`animate-step-in ${pickClassName}`.trim()}>
          {renderPick(choose)}
        </div>
      )}
    </BottomSheetModal>
  );
}
