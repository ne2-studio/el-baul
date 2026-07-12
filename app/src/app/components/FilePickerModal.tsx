import React from 'react';
import { X, Image, Folder } from 'lucide-react';
import { Button } from './Button';
import { Baul } from './BaulesList';
import { Album } from './AlbumsView';
import { SelectedPhoto } from './UploadConfirmationScreen';

interface FilePickerModalProps {
  baul: Baul;
  album: Album;
  onBack: () => void;
  onUpload: (selectedPhotos: SelectedPhoto[]) => void;
}

export function FilePickerModal({ baul, album, onBack, onUpload }: FilePickerModalProps) {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Convert FileList to SelectedPhoto array
    const selectedPhotos: SelectedPhoto[] = Array.from(files).map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file)
    }));
    
    onUpload(selectedPhotos);
  };
  
  return (
    <div className="fixed inset-0 bg-foreground/40 z-50 flex items-end md:items-center justify-center">
      {/* Bottom sheet on mobile, modal on desktop */}
      <div className="bg-card w-full md:max-w-md md:mx-auto rounded-t-3xl md:rounded-3xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl text-foreground">Añadir fotos</h2>
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground text-center mb-6">
            Puedes seleccionar varias fotos a la vez
          </p>
          
          {/* Photo library option */}
          <label className="block">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Image className="w-6 h-6 text-primary" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground mb-1">Fotos del dispositivo</h3>
                <p className="text-sm text-muted-foreground">Elige desde tu galería</p>
              </div>
            </div>
          </label>
          
          {/* Files option (future) */}
          <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-border opacity-50">
            <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
              <Folder className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground mb-1">Archivos</h3>
              <p className="text-sm text-muted-foreground">Próximamente</p>
            </div>
          </div>
          
          {/* Cancel */}
          <div className="pt-4">
            <Button variant="ghost" fullWidth onClick={onBack}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}