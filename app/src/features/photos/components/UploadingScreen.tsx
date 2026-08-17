import React, { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';
import { SelectedPhoto } from '@/features/photos/uploadFlow';
import { UploadItemResult } from '@/features/photos/uploadFlow';

type PhotoStatus = 'pending' | 'success' | 'error';

interface UploadingScreenProps {
  photos: SelectedPhoto[];
  onUpload: (photos: SelectedPhoto[], onItemSettled: (result: UploadItemResult) => void) => Promise<UploadItemResult[]>;
  onSettled: (results: UploadItemResult[]) => void;
}

export function UploadingScreen({ photos, onUpload, onSettled }: UploadingScreenProps) {
  const [statuses, setStatuses] = useState<Record<string, PhotoStatus>>(() =>
    Object.fromEntries(photos.map((p) => [p.id, 'pending' as PhotoStatus]))
  );

  useEffect(() => {
    let cancelled = false;

    onUpload(photos, (result) => {
      if (cancelled) return;
      setStatuses((prev) => ({ ...prev, [result.clientUploadId]: result.error ? 'error' : 'success' }));
    }).then((results) => {
      if (!cancelled) onSettled(results);
    });

    return () => {
      cancelled = true;
    };
    // Runs once per mount to kick off the real upload, regardless of onUpload/onSettled identity changes afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const succeededCount = Object.values(statuses).filter((s) => s === 'success').length;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center px-6">
      {/* Header: icon, title and progress stay visible while the photo grid scrolls
          independently below (see issue #37 — large batches used to push these off-screen). */}
      <div className="max-w-md w-full text-center shrink-0 pt-6">
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

        {/* Live progress */}
        <p className="text-muted-foreground mb-8">
          {succeededCount} de {photos.length} fotos subidas
        </p>
      </div>

      {/* Per-photo status grid — scrolls on its own so the header above stays reachable
          regardless of how many photos are in this batch. */}
      <div className="max-w-md w-full flex-1 min-h-0 overflow-y-auto pb-6">
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square">
              <img
                src={photo.preview}
                alt="Preview"
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-background/90 shadow">
                {statuses[photo.id] === 'pending' && (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                )}
                {statuses[photo.id] === 'success' && <Check className="w-4 h-4 text-green-600" />}
                {statuses[photo.id] === 'error' && <X className="w-4 h-4 text-destructive" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
