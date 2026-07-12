import React from 'react';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';
import { Baul } from './BaulesList';
import { Album } from './AlbumsView';

interface UploadErrorScreenProps {
  baul: Baul;
  album: Album;
  onBack: () => void;
}

export function UploadErrorScreen({ baul, album, onBack }: UploadErrorScreenProps) {
  const handleRetry = () => {
    // Go back to photos view - user can try again
    onBack();
  };
  
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
        
        {/* Reassuring message */}
        <p className="text-muted-foreground mb-12">
          Puedes intentarlo de nuevo cuando quieras
        </p>
        
        {/* Actions */}
        <div className="space-y-3">
          <Button variant="primary" fullWidth onClick={handleRetry}>
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