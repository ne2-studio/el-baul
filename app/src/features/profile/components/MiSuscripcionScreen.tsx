import React from 'react';
import { Crown, HardDrive } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { Notice } from '@/design-system/components/feedback/Notice';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';

export type PlanType = 'gratuito' | 'familiar' | 'premium';

interface SubscriptionInfo {
  currentPlan: PlanType;
  baulesUsed: number;
  baulesLimit: number;
  storagePerBaulGB: number;
}

interface MiSuscripcionScreenProps {
  onBack: () => void;
  subscription: SubscriptionInfo;
  onChangePlan: () => void;
}

export function MiSuscripcionScreen({ onBack, subscription, onChangePlan }: MiSuscripcionScreenProps) {
  const isPremium = subscription.currentPlan === 'premium';
  
  return (
    <div className="min-h-screen bg-background">
      <PageHeader variant="inline" onBack={onBack} title="Mi suscripción" />

      {/* Content */}
      <PageContainer className="py-8">
        {/* Current plan card */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Plan actual</p>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-serif text-foreground">
                  {isPremium ? 'Premium' : 'Gratuito'}
                </h2>
                {isPremium && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10">
                    <Crown className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
            </div>
            {isPremium && (
              <div className="text-right">
                <p className="text-2xl font-serif text-foreground">5 €</p>
                <p className="text-sm text-muted-foreground">al mes</p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border my-4" />

          {/* Plan features */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <BaulIcon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-foreground">
                  {subscription.baulesUsed} / {subscription.baulesLimit} baúles como custodio
                </p>
                <p className="text-sm text-muted-foreground">
                  {subscription.baulesLimit - subscription.baulesUsed} {subscription.baulesLimit - subscription.baulesUsed === 1 ? 'disponible' : 'disponibles'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <HardDrive className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-foreground">
                  {subscription.storagePerBaulGB} GB por baúl custodiado
                </p>
                <p className="text-sm text-muted-foreground">
                  Espacio para tus recuerdos más importantes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <Notice className="mb-6">
          Tu plan define cuántos baúles puedes custodiar y el espacio disponible para guardar tus recuerdos.
        </Notice>

        {/* CTA */}
        <Button
          variant="primary"
          fullWidth
          onClick={onChangePlan}
        >
          Cambiar de plan
        </Button>

        {/* Additional info for free plan */}
        {!isPremium && (
          <div className="mt-6 px-4">
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              Colaborar en baúles de otras personas es siempre gratuito, sin límite.
            </p>
          </div>
        )}

        {/* Cancel info for premium */}
        {isPremium && (
          <div className="mt-6 px-4">
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              Puedes cambiar o cancelar tu plan cuando quieras.
            </p>
          </div>
        )}
      </PageContainer>
    </div>
  );
}
