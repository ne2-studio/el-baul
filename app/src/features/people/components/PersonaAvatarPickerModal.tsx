import { useEffect, useRef } from 'react';
import { ImageIcon, Loader2, Upload } from 'lucide-react';
import { PhotoCrop } from '@/api';
import { Button } from '@/design-system/components/actions/Button';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { LoadingSpinner } from '@/design-system/components/feedback/LoadingSpinner';
import { SwimlaneLabel } from '@/design-system/components/data-display/SwimlaneLabel';
import { PickThenCropModal } from '@/design-system/patterns/media/PickThenCropModal';
import { Photo } from '@/types';
import { FetchPhotoPage, useInfinitePhotoPage } from '@/hooks/useInfinitePhotoPage';

interface PersonaAvatarPickerModalProps {
  personaName: string;
  taggedPhotos: Photo[];
  fetchPage: FetchPhotoPage;
  onSelectExisting: (photo: Photo, crop: PhotoCrop) => void;
  onUploadNew: (file: File, crop: PhotoCrop) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

type AvatarSource =
  | { kind: 'photo'; photo: Photo; url: string }
  | { kind: 'file'; file: File; url: string };

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

export function PersonaAvatarPickerModal({
  personaName,
  taggedPhotos,
  fetchPage,
  onSelectExisting,
  onUploadNew,
  onCancel,
  isSubmitting = false,
}: PersonaAvatarPickerModalProps) {
  const { photos, isLoading, isInitialLoad, sentinelRef } = useInfinitePhotoPage(fetchPage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const taggedIds = new Set(taggedPhotos.map((photo) => photo.id));
  const untaggedPhotos = photos.filter((photo) => !taggedIds.has(photo.id));

  const save = (source: AvatarSource, crop: PhotoCrop) => {
    if (source.kind === 'file') onUploadNew(source.file, crop);
    else onSelectExisting(source.photo, crop);
  };

  return (
    <PickThenCropModal<AvatarSource>
      onCancel={onCancel}
      pickTitle={`Foto de ${personaName}`}
      cropTitle="Ajustar foto"
      pickClassName="space-y-5"
      cropSrc={(source) => source.url}
      shape="circle"
      renderCropFooter={(source, crop) => (
        <SaveAvatarButton isSubmitting={isSubmitting} onClick={() => save(source, crop)} />
      )}
      renderPick={(choose) => {
        const choosePhoto = (photo: Photo) => choose({ kind: 'photo', photo, url: photo.fullUrl });
        const chooseFile = (file: File) => {
          if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
          const url = URL.createObjectURL(file);
          objectUrlRef.current = url;
          choose({ kind: 'file', file, url });
        };
        const selectedPhotoId: string | undefined = undefined;

        return (
          <>
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
          </>
        );
      }}
    />
  );
}

function SaveAvatarButton({ isSubmitting, onClick }: { isSubmitting: boolean; onClick: () => void }) {
  return (
    <Button variant="primary" onClick={onClick} disabled={isSubmitting} className="w-full flex items-center justify-center gap-2">
      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
      Guardar foto
    </Button>
  );
}
