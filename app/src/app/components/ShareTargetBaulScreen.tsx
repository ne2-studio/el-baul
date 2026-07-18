import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { BaulIcon } from './BaulIcon';
import { Baul } from '@/types';

interface ShareTargetBaulScreenProps {
  baules: Baul[];
  photoCount: number;
  onSelectBaul: (baul: Baul) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ShareTargetBaulScreen({
  baules,
  photoCount,
  onSelectBaul,
  onCancel,
  isLoading,
}: ShareTargetBaulScreenProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-5">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Cancelar</span>
          </button>
          <h1 className="text-3xl text-foreground mb-1">
            Compartir {photoCount} {photoCount === 1 ? 'foto' : 'fotos'}
          </h1>
          <p className="text-sm text-muted-foreground">Elige a qué baúl quieres añadirlas</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 pb-24">
        {baules.length === 0 ? (
          <EmptyState
            icon={<BaulIcon className="w-20 h-20" />}
            title="Aún no tienes baúles"
            subtitle="Crea un baúl desde El Baúl antes de compartir fotos"
          />
        ) : (
          <div className="space-y-3">
            {baules.map((baul) => (
              <Card
                key={baul.id}
                onClick={isLoading ? undefined : () => onSelectBaul(baul)}
                className="flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                  {baul.coverPhotoUrl ? (
                    <img src={baul.coverPhotoUrl} alt={baul.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BaulIcon className="w-6 h-6 text-muted-foreground opacity-40" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-foreground text-lg leading-tight truncate">{baul.name}</h3>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {baul.albumCount} {baul.albumCount === 1 ? 'capítulo' : 'capítulos'}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
