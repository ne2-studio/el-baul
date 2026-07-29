import React from 'react';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { UserCircle } from 'lucide-react';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { StickyHeader } from '@/design-system/layouts/StickyHeader';
import { Baul } from '@/types';
import { Button } from '@/design-system/components/actions/Button';
import { BaulCard } from '@/features/baules/components/BaulCard';
import { SwimlaneLabel } from '@/design-system/components/data-display/SwimlaneLabel';

interface BaulesListProps {
  baules: Baul[];
  onSelectBaul: (baul: Baul) => void;
  onCreateBaul: () => void;
  onOpenProfileMenu: () => void;
  baulesUsed?: number;
  baulesLimit?: number;
  monetizationEnabled?: boolean;
}

export function BaulesList({
  baules,
  onSelectBaul,
  onCreateBaul,
  onOpenProfileMenu,
  baulesUsed,
  baulesLimit,
  monetizationEnabled
}: BaulesListProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <StickyHeader>
        <PageContainer className="py-5 flex items-center justify-between">
          <h1 className="text-3xl font-serif text-foreground">El Baúl</h1>
          <div className="flex items-center gap-2">
            <Button variant="plain"
              onClick={onOpenProfileMenu}
              className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
              aria-label="Abrir menú de cuenta"
            >
              <UserCircle className="w-6 h-6 text-primary" />
            </Button>
          </div>
        </PageContainer>
      </StickyHeader>

      {/* Content */}
      <PageContainer className="py-6 pb-24">
        <section>
          <SwimlaneLabel>Mis baúles</SwimlaneLabel>

          {baules.length === 0 ? (
            <EmptyState
              icon={<BaulIcon className="w-20 h-20" />}
              title="Aún no tienes baúles"
              subtitle="Crea tu primer baúl para empezar a guardar tus recuerdos más preciados"
            />
          ) : (
            <div className="space-y-4">
              {baules.map((baul) => (
                <BaulCard key={baul.id} baul={baul} onClick={() => onSelectBaul(baul)} />
              ))}
            </div>
          )}

          {/* Plan limit indicator */}
          {monetizationEnabled && baulesUsed !== undefined && baulesLimit !== undefined && (
            <div className="mt-4 px-1">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Baúles como custodio</span>
                <span className="font-medium text-foreground">
                  {baulesUsed} / {baulesLimit}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min((baulesUsed / baulesLimit) * 100, 100)}%` }}
                />
              </div>

              {/* Helper text */}
              {baulesUsed >= baulesLimit && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Has alcanzado el límite de tu plan
                </p>
              )}
            </div>
          )}
        </section>
      </PageContainer>

      <SimpleFAB label="Nuevo baúl" onClick={onCreateBaul} />
    </div>
  );
}
