import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { ChevronLeft, X } from 'lucide-react';
import { Baul } from './BaulesList';
import { Album } from './AlbumsView';
import { getRelativeTime } from '../utils/timeUtils';

export interface SelectedPhoto {
  id: string;
  file: File;
  preview: string;
  captureDate?: Date;
  caption?: string;
  date?: string;
}

interface UploadConfirmationScreenProps {
  baul: Baul;
  album: Album;
  selectedPhotos: SelectedPhoto[];
  onBack: () => void;
  onUpload: (caption?: string) => void;
}

export function UploadConfirmationScreen({ 
  baul,
  album, 
  selectedPhotos, 
  onBack, 
  onUpload 
}: UploadConfirmationScreenProps) {
  const [caption, setCaption] = useState('');
  const [photos, setPhotos] = useState(selectedPhotos);
  
  const handleRemovePhoto = (id: string) => {
    setPhotos(photos.filter(p => p.id !== id));
  };
  
  const handleConfirm = () => {
    onUpload(caption || undefined);
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-5">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Volver</span>
          </button>
          <h1 className="text-3xl text-foreground mb-1">Añadir fotos al álbum</h1>
          <p className="text-sm text-muted-foreground">{album.name}</p>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Photo count */}
        <div className="mb-6">
          <p className="text-center text-muted-foreground">
            {photos.length} {photos.length === 1 ? 'foto seleccionada' : 'fotos seleccionadas'}
          </p>
        </div>
        
        {/* Photo grid with remove option */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square group">
              <img
                src={photo.preview}
                alt="Preview"
                className="w-full h-full object-cover rounded-lg"
              />
              {/* Remove button */}
              <button
                onClick={() => handleRemovePhoto(photo.id)}
                className="absolute -top-2 -right-2 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        
        {/* Optional caption */}
        <div className="mb-8">
          <Input
            label="Nota para estas fotos (opcional)"
            placeholder="Ej: Verano en la playa..."
            value={caption}
            onChange={setCaption}
            multiline
            rows={2}
          />
        </div>
        
        {/* Actions */}
        <div className="space-y-3">
          <Button 
            variant="primary" 
            fullWidth 
            onClick={handleConfirm}
          >
            Guardar recuerdos
          </Button>
          <Button variant="ghost" fullWidth onClick={onBack}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}