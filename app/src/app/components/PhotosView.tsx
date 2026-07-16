import React from 'react';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { ChevronLeft, Plus, ImageIcon, MessageCircle } from 'lucide-react';
import { Album } from './AlbumsView';

export interface Photo {
  id: string;
  url: string;
  caption?: string;
  date?: string;
  recuerdoCount?: number;
}

interface PhotosViewProps {
  album: Album;
  photos: Photo[];
  onBack: () => void;
  onSelectPhoto: (photo: Photo) => void;
  onAddPhotos: () => void;
}

export function PhotosView({ album, photos, onBack, onSelectPhoto, onAddPhotos }: PhotosViewProps) {
  const totalRecuerdos = photos.reduce((sum, photo) => sum + (photo.recuerdoCount || 0), 0);

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
          <h1 className="text-3xl text-foreground">{album.name}</h1>
          {album.description && (
            <p className="text-sm text-muted-foreground mt-1">{album.description}</p>
          )}
          {totalRecuerdos > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <MessageCircle className="w-3.5 h-3.5 text-muted-foreground/60" strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground/75">
                {totalRecuerdos} {totalRecuerdos === 1 ? 'recuerdo' : 'recuerdos'} en este álbum
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6">
        {photos.length === 0 ? (
          <div>
            <EmptyState
              icon={<ImageIcon className="w-20 h-20" strokeWidth={1.5} />}
              title="Todavía no hay fotos aquí"
              subtitle="Añade fotos para empezar este recuerdo"
            />
            {/* Primary CTA for empty state */}
            <div className="mt-8 max-w-sm mx-auto">
              <Button 
                variant="primary" 
                fullWidth 
                onClick={onAddPhotos}
                className="flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Añadir tus primeras fotos
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => onSelectPhoto(photo)}
                  className="aspect-square bg-secondary rounded-lg overflow-hidden hover:opacity-90 transition-opacity relative group"
                >
                  <img
                    src={photo.thumbnailUrl}
                    alt={photo.caption || 'Foto'}
                    className="w-full h-full object-cover"
                  />
                  {(photo.recuerdoCount || 0) > 0 && (
                    <div className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-75 group-hover:opacity-90 transition-opacity">
                      <MessageCircle className="w-3.5 h-3.5 text-foreground/70" strokeWidth={1.5} />
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            {/* Add more photos button */}
            <div className="mt-6">
              <Button 
                variant="primary" 
                fullWidth 
                onClick={onAddPhotos}
                className="flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Añadir fotos
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}