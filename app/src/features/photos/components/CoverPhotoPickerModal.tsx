import { ImageIcon } from 'lucide-react';
import { LoadingSpinner } from '@/design-system/components/feedback/LoadingSpinner';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { PickThenCropModal } from '@/design-system/patterns/media/PickThenCropModal';
import { Photo } from '@/types';
import { PhotoCrop } from '@/api';
import { Button } from '@/design-system/components/actions/Button';
import { FetchPhotoPage, useInfinitePhotoPage } from '@/hooks/useInfinitePhotoPage';

// Every cover placement (chapter-cover, chapter-cover-featured, baul-cover) renders at 8:5 —
// see imgproxy/presets.conf — so the crop preview matches what the picked focal point/zoom will
// actually produce.
const COVER_ASPECT_RATIO = 8 / 5;

interface CoverPhotoPickerModalProps {
  title: string;
  fetchPage: FetchPhotoPage;
  onSelect: (photo: Photo, crop: PhotoCrop) => void;
  onCancel: () => void;
}

export function CoverPhotoPickerModal({ title, fetchPage, onSelect, onCancel }: CoverPhotoPickerModalProps) {
  const { photos, isLoading, isInitialLoad, sentinelRef } = useInfinitePhotoPage(fetchPage);

  const save = (photo: Photo, crop: PhotoCrop) => {
    onSelect(photo, crop);
    onCancel();
  };

  return (
    <PickThenCropModal<Photo>
      onCancel={onCancel}
      pickTitle={title}
      cropTitle="Ajustar portada"
      cropSrc={(photo) => photo.fullUrl}
      shape="rect"
      aspectRatio={COVER_ASPECT_RATIO}
      renderCropFooter={(photo, crop) => (
        <Button variant="primary" onClick={() => save(photo, crop)} className="w-full flex items-center justify-center gap-2">
          Guardar portada
        </Button>
      )}
      renderPick={(choose) =>
        isInitialLoad ? (
          <LoadingSpinner message="Cargando fotos..." />
        ) : photos.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="w-16 h-16" strokeWidth={1.5} />}
            title="Todavía no hay fotos aquí"
            subtitle="Añade fotos antes de elegir una portada"
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <Button
                  variant="plain"
                  key={p.id}
                  onClick={() => choose(p)}
                  className="aspect-square bg-secondary rounded-lg overflow-hidden hover:opacity-90 active:opacity-80 transition-opacity"
                >
                  <img src={p.thumbnailUrl} alt="Foto" className="w-full h-full object-cover" draggable={false} />
                </Button>
              ))}
            </div>
            <div ref={sentinelRef} className="h-1" />
            {isLoading && <LoadingSpinner size="sm" />}
          </>
        )
      }
    />
  );
}
