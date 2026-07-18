import React, { useEffect } from 'react';
import { BaulIcon } from './BaulIcon';
import { Baul } from './BaulesList';
import { Album } from './AlbumsView';

interface UploadingScreenProps {
  baul: Baul;
  album: Album;
  photoCount: number;
  onBack: () => void;
  onSuccess: () => void;
}

export function UploadingScreen({ baul, album, photoCount, onBack, onSuccess }: UploadingScreenProps) {
  useEffect(() => {
    onSuccess();
    // Runs once per mount to kick off the real upload, regardless of onSuccess identity changes afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
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
        
        {/* Reassuring message */}
        <p className="text-muted-foreground mb-8">
          Esto puede tardar unos segundos
        </p>
        
        {/* Soft progress indicator - just a subtle animated bar */}
        <div className="w-full max-w-xs mx-auto h-1 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-progress" style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  );
}