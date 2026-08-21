import React, { useEffect, useState } from 'react';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';
import { PhotoStack } from '@/design-system/patterns/media/PhotoStack';
import { SelectedPhoto } from '@/features/photos/uploadFlow';
import { UploadItemResult } from '@/features/photos/uploadFlow';

interface UploadingScreenProps {
  photos: SelectedPhoto[];
  onUpload: (photos: SelectedPhoto[], onItemSettled: (result: UploadItemResult) => void) => Promise<UploadItemResult[]>;
  onSettled: (results: UploadItemResult[]) => void;
}

export function UploadingScreen({ photos, onUpload, onSettled }: UploadingScreenProps) {
  // Only the total settled count (success + error combined) is tracked — nothing renders
  // per-photo anymore, so there's no need for a status map. This also fixes issue #42: a fixed-
  // size layout regardless of batch size, instead of a per-photo grid that got stuck on large
  // batches.
  const [settledCount, setSettledCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    onUpload(photos, () => {
      if (cancelled) return;
      setSettledCount((prev) => prev + 1);
    }).then((results) => {
      if (!cancelled) onSettled(results);
    });

    return () => {
      cancelled = true;
    };
    // Runs once per mount to kick off the real upload, regardless of onUpload/onSettled identity changes afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewPhotos = photos.slice(0, 3).map((photo) => photo.preview);

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Animated icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center relative">
            <BaulIcon className="w-10 h-10 text-primary animate-pulse" />
            {/* Soft glow effect */}
            <div className="absolute inset-0 rounded-3xl bg-primary/20 animate-ping" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl mb-3 text-foreground">
          Guardando tus recuerdos…
        </h2>

        {/* Static preview of a subset of the batch, instead of a full per-photo grid — see
            issue #42. */}
        {previewPhotos.length > 0 && (
          <div className="mb-8 flex justify-center">
            <PhotoStack photos={previewPhotos} />
          </div>
        )}

        {/* Live progress */}
        <p className="text-muted-foreground">
          Subiendo {settledCount} de {photos.length} fotos
        </p>
      </div>
    </div>
  );
}
