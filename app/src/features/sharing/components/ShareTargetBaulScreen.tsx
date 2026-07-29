import React from 'react';
import { Card } from '@/design-system/components/data-display/Card';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
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
      <PageHeader
        variant="stacked"
        onBack={onCancel}
        backLabel="Cancelar"
        title={`Compartir ${photoCount} ${photoCount === 1 ? 'foto' : 'fotos'}`}
        subtitle="Elige a qué baúl quieres añadirlas"
      />

      <PageContainer className="py-6 pb-24">
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
                    {baul.chapterCount} {baul.chapterCount === 1 ? 'capítulo' : 'capítulos'}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
