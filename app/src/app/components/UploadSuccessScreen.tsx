import React from 'react';
import { Button } from './Button';
import { CheckCircle } from 'lucide-react';
import { Baul } from './BaulesList';
import { Album } from './AlbumsView';

interface UploadSuccessScreenProps {
  baul: Baul;
  album: Album;
  photoCount: number;
  onBack: () => void;
}

export function UploadSuccessScreen({ baul, album, photoCount, onBack }: UploadSuccessScreenProps) {
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-primary" strokeWidth={1.5} />
          </div>
        </div>
        
        {/* Title */}
        <h2 className="text-3xl mb-3 text-foreground">
          Tus recuerdos ya están a salvo
        </h2>
        
        {/* Confirmation message with emotional context */}
        <p className="text-lg text-muted-foreground mb-2">
          {photoCount} {photoCount === 1 ? 'foto guardada' : 'fotos guardadas'} en el baúl
        </p>
        
        {/* Emotional reinforcement about time */}
        <p className="text-sm text-muted-foreground/75 italic mb-12">
          Esos momentos permanecerán contigo para siempre
        </p>
        
        {/* CTA */}
        <Button variant="primary" fullWidth onClick={onBack}>
          Ver álbum
        </Button>
      </div>
    </div>
  );
}