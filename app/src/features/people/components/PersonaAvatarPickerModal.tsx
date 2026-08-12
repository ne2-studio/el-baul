import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { PhotoCrop } from '@/api';
import { Button } from '@/design-system/components/actions/Button';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { LoadingSpinner } from '@/design-system/components/feedback/LoadingSpinner';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { SwimlaneLabel } from '@/design-system/components/data-display/SwimlaneLabel';
import { DEFAULT_PHOTO_CROP, PhotoCropStep } from '@/design-system/patterns/media/PhotoCropStep';
import { Photo } from '@/types';

const PAGE_SIZE = 60;

interface PersonaAvatarPickerModalProps {
  personaName: string;
  taggedPhotos: Photo[];
  fetchPage: (skip: number, take: number) => Promise<{ photos: Photo[]; hasMore: boolean }>;
  onSelectExisting: (photo: Photo, crop: PhotoCrop) => void;
  onUploadNew: (file: File, crop: PhotoCrop) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

type AvatarSource =
  | { kind: 'photo'; photo: Photo; url: string }
  | { kind: 'file'; file: File; url: string };

type PickerStep = 'pick' | 'crop';

function PhotoPickGrid({
  photos,
  selectedId,
  onChoose,
}: {
  photos: Photo[];
  selectedId: string | undefined;
  onChoose: (photo: Photo) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <Button
          variant="plain"
          key={photo.id}
          onClick={() => onChoose(photo)}
          className={`relative aspect-square overflow-hidden rounded-lg bg-secondary transition-opacity hover:opacity-90 active:opacity-80 ${
            selectedId === photo.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''
          }`}
          aria-label={`Elegir foto ${photo.id}`}
        >
          <img src={photo.thumbnailUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        </Button>
      ))}
    </div>
  );
}

function useInfinitePhotoPage(fetchPage: PersonaAvatarPickerModalProps['fetchPage']) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { photos, isLoading, isInitialLoad, loadMore };
}

export function PersonaAvatarPickerModal({
  personaName,
  taggedPhotos,
  fetchPage,
  onSelectExisting,
  onUploadNew,
  onCancel,
  isSubmitting = false,
}: PersonaAvatarPickerModalProps) {
  const { photos, isLoading, isInitialLoad, loadMore } = useInfinitePhotoPage(fetchPage);
  const [step, setStep] = useState<PickerStep>('pick');
  const [source, setSource] = useState<AvatarSource | null>(null);
  const [crop, setCrop] = useState<PhotoCrop>(DEFAULT_PHOTO_CROP);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const taggedIds = new Set(taggedPhotos.map((photo) => photo.id));
  const untaggedPhotos = photos.filter((photo) => !taggedIds.has(photo.id));

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, isInitialLoad]);

  useEffect(() => {
    return () => {
      if (source?.kind === 'file') URL.revokeObjectURL(source.url);
    };
  }, [source]);

  const choosePhoto = (photo: Photo) => {
    setSource({ kind: 'photo', photo, url: photo.fullUrl });
    setCrop(DEFAULT_PHOTO_CROP);
    setStep('crop');
  };

  const chooseFile = (file: File) => {
    if (source?.kind === 'file') URL.revokeObjectURL(source.url);
    setSource({ kind: 'file', file, url: URL.createObjectURL(file) });
    setCrop(DEFAULT_PHOTO_CROP);
    setStep('crop');
  };

  const save = () => {
    if (!source) return;
    if (source.kind === 'file') onUploadNew(source.file, crop);
    else onSelectExisting(source.photo, crop);
  };

  const selectedPhotoId = source?.kind === 'photo' ? source.photo.id : undefined;

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
                onClick={() => setStep('pick')}
                aria-label="Volver"
                className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-serif text-foreground truncate">Ajustar foto</h2>
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
            <h2 className="text-xl font-serif text-foreground">Foto de {personaName}</h2>
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
          <PhotoCropStep src={source.url} alt="" crop={crop} onChange={setCrop} shape="circle" />

          <Button variant="primary" onClick={save} disabled={isSubmitting} className="w-full flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar foto
          </Button>
        </div>
      ) : (
        <div key="pick" className="space-y-5 animate-step-in">
          <div className="rounded-2xl border border-border bg-secondary/60 p-4 text-sm text-foreground">
            La foto que subas se añadirá al baúl como una foto suelta.
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) chooseFile(file);
              event.target.value = '';
            }}
          />

          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" />
            Subir foto nueva
          </Button>

          {isInitialLoad ? (
            <LoadingSpinner message="Cargando fotos..." />
          ) : taggedPhotos.length === 0 && untaggedPhotos.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="w-16 h-16" strokeWidth={1.5} />}
              title="Todavía no hay fotos"
              subtitle="Sube una foto nueva para usarla en esta ficha"
            />
          ) : (
            <>
              {taggedPhotos.length > 0 && (
                <div className="space-y-3">
                  <SwimlaneLabel>Fotos en las que sale {personaName}</SwimlaneLabel>
                  <PhotoPickGrid photos={taggedPhotos} selectedId={selectedPhotoId} onChoose={choosePhoto} />
                </div>
              )}
              {untaggedPhotos.length > 0 && (
                <div className="space-y-3">
                  {taggedPhotos.length > 0 && <SwimlaneLabel>Resto de fotos</SwimlaneLabel>}
                  <PhotoPickGrid photos={untaggedPhotos} selectedId={selectedPhotoId} onChoose={choosePhoto} />
                </div>
              )}
              <div ref={sentinelRef} className="h-1" />
              {isLoading && <LoadingSpinner size="sm" />}
            </>
          )}
        </div>
      )}
    </BottomSheetModal>
  );
}
