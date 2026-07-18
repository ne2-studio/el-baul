import React from 'react';
import { Button } from './Button';
import { AlertCircle, X } from 'lucide-react';
import { SelectedPhoto } from './UploadConfirmationScreen';

interface UploadErrorScreenProps {
  failedPhotos: SelectedPhoto[];
  succeededCount: number;
  onRetry: () => void;
  onBack: () => void;
}

export function UploadErrorScreen({ failedPhotos, succeededCount, onRetry, onBack }: UploadErrorScreenProps) {
  const totalCount = succeededCount + failedPhotos.length;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Error icon - soft, non-alarming */}
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground" strokeWidth={1.5} />
          </div>
        </div>

        {/* Title - non-alarming */}
        <h2 className="text-2xl mb-3 text-foreground">
          Algo no ha salido bien
        </h2>

        {/* Summary */}
        <p className="text-muted-foreground mb-6">
          {succeededCount} de {totalCount} fotos subidas · {failedPhotos.length} con error
        </p>

        {/* Failed photos grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {failedPhotos.map((photo) => (
            <div key={photo.id} className="relative aspect-square">
              <img
                src={photo.preview}
                alt="Preview"
                className="w-full h-full object-cover rounded-lg opacity-60"
              />
              <div className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-background/90 shadow">
                <X className="w-4 h-4 text-destructive" />
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button variant="primary" fullWidth onClick={onRetry}>
            Reintentar
          </Button>
          <Button variant="ghost" fullWidth onClick={onBack}>
            Volver al álbum
          </Button>
        </div>
      </div>
    </div>
  );
}
