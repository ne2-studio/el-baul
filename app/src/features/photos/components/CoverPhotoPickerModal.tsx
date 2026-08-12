import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ImageIcon, X } from 'lucide-react';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { LoadingSpinner } from '@/design-system/components/feedback/LoadingSpinner';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { DEFAULT_PHOTO_CROP, PhotoCropStep } from '@/design-system/patterns/media/PhotoCropStep';
import { Photo } from '@/types';
import { PhotoCrop } from '@/api';
import { Button } from '@/design-system/components/actions/Button';
import { useLoadMoreSentinel } from '@/hooks/useLoadMoreSentinel';

const PAGE_SIZE = 60;
// Every cover placement (chapter-cover, chapter-cover-featured, baul-cover) renders at 8:5 —
// see imgproxy/presets.conf — so the crop preview matches what the picked focal point/zoom will
// actually produce.
const COVER_ASPECT_RATIO = 8 / 5;

interface CoverPhotoPickerModalProps {
  title: string;
  fetchPage: (skip: number, take: number) => Promise<{ photos: Photo[]; hasMore: boolean }>;
  onSelect: (photo: Photo, crop: PhotoCrop) => void;
  onCancel: () => void;
}

type PickerStep = 'pick' | 'crop';

// Paginates through fetchPage, accumulating photos as the caller scrolls — the picker's own
// concern (skip cursor, in-flight guard, hasMore) is kept separate from how the page is
// actually fetched, which the caller supplies (baúl-wide vs. chapter-scoped).
function useInfinitePhotoPage(fetchPage: CoverPhotoPickerModalProps['fetchPage']) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const skipRef = useRef(0);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setIsLoading(true);
    try {
      const page = await fetchPage(skipRef.current, PAGE_SIZE);
      skipRef.current += page.photos.length;
      setPhotos((prev) => [...prev, ...page.photos]);
      setHasMore(page.hasMore);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
      loadingRef.current = false;
    }
  }, [fetchPage, hasMore]);

  useEffect(() => {
    loadMore();
    // Only the first page loads automatically — subsequent pages come from the sentinel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { photos, hasMore, isLoading, isInitialLoad, loadMore };
}

export function CoverPhotoPickerModal({ title, fetchPage, onSelect, onCancel }: CoverPhotoPickerModalProps) {
  const { photos, isLoading, isInitialLoad, loadMore } = useInfinitePhotoPage(fetchPage);
  // isInitialLoad as remountKey: the sentinel <div> is only rendered once the first page is
  // in, so the observer needs to (re-)attach once that happens — see useLoadMoreSentinel.
  const sentinelRef = useLoadMoreSentinel(loadMore, isInitialLoad);
  const [step, setStep] = useState<PickerStep>('pick');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [crop, setCrop] = useState<PhotoCrop>(DEFAULT_PHOTO_CROP);

  const choosePhoto = (chosen: Photo) => {
    setPhoto(chosen);
    setCrop(DEFAULT_PHOTO_CROP);
    setStep('crop');
  };

  const save = () => {
    if (!photo) return;
    onSelect(photo, crop);
    onCancel();
  };

  return (
    <BottomSheetModal
      onCancel={onCancel}
      size="lg"
      header={
        step === 'crop' && photo ? (
          <>
            <div className="flex items-center gap-1 min-w-0">
              <Button
                variant="plain"
                onClick={() => setStep('pick')}
                aria-label="Volver"
                className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-serif text-foreground truncate">Ajustar portada</h2>
            </div>
            <Button variant="plain"
              onClick={onCancel}
              aria-label="Cerrar"
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-serif text-foreground">{title}</h2>
            <Button variant="plain"
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
      {step === 'crop' && photo ? (
        <div key="crop" className="space-y-4 animate-step-in">
          <PhotoCropStep src={photo.fullUrl} alt="" crop={crop} onChange={setCrop} shape="rect" aspectRatio={COVER_ASPECT_RATIO} />

          <Button variant="primary" onClick={save} className="w-full flex items-center justify-center gap-2">
            Guardar portada
          </Button>
        </div>
      ) : isInitialLoad ? (
        <LoadingSpinner message="Cargando fotos..." />
      ) : photos.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="w-16 h-16" strokeWidth={1.5} />}
          title="Todavía no hay fotos aquí"
          subtitle="Añade fotos antes de elegir una portada"
        />
      ) : (
        <div key="pick" className="animate-step-in">
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <Button variant="plain"
                key={p.id}
                onClick={() => choosePhoto(p)}
                className="aspect-square bg-secondary rounded-lg overflow-hidden hover:opacity-90 active:opacity-80 transition-opacity"
              >
                <img src={p.thumbnailUrl} alt="Foto" className="w-full h-full object-cover" draggable={false} />
              </Button>
            ))}
          </div>
          <div ref={sentinelRef} className="h-1" />
          {isLoading && <LoadingSpinner size="sm" />}
        </div>
      )}
    </BottomSheetModal>
  );
}
