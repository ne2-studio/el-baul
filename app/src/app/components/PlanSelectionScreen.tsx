import React, { useState } from 'react';
import { ChevronLeft, Check, Crown, Archive, HardDrive, Users } from 'lucide-react';
import { Button } from './Button';
import { PlanType } from './MiSuscripcionScreen';

interface PlanSelectionScreenProps {
  onBack: () => void;
  currentPlan: PlanType;
  onUpdatePlan: (newPlan: PlanType) => void;
}

export function PlanSelectionScreen({ onBack, currentPlan, onUpdatePlan }: PlanSelectionScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(currentPlan);
  
  const handleUpdatePlan = () => {
    if (selectedPlan !== currentPlan) {
      onUpdatePlan(selectedPlan);
    }
  };
  
  const isChangingPlan = selectedPlan !== currentPlan;
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors -ml-2"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-3xl text-foreground">Elige tu plan</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Plan cards */}
        <div className="space-y-4 mb-6">
          {/* Free plan */}
          <button
            onClick={() => setSelectedPlan('gratuito')}
            className={`w-full text-left bg-card rounded-2xl border-2 p-6 transition-all ${
              selectedPlan === 'gratuito'
                ? 'border-primary shadow-lg'
                : 'border-border hover:border-border/60'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-2xl font-serif text-foreground">Gratuito</h2>
                  {currentPlan === 'gratuito' && (
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      Plan actual
                    </span>
                  )}
                </div>
                <p className="text-3xl font-serif text-foreground mb-1">0 €</p>
                <p className="text-sm text-muted-foreground">al mes</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selectedPlan === 'gratuito'
                  ? 'border-primary bg-primary'
                  : 'border-border'
              }`}>
                {selectedPlan === 'gratuito' && (
                  <Check className="w-4 h-4 text-background" />
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border my-4" />

            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Archive className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-foreground text-sm">
                  Hasta <strong>2 baúles</strong> como custodio
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <HardDrive className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-foreground text-sm">
                  <strong>10 GB</strong> por baúl custodiado
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-foreground text-sm">
                  Colabora en <strong>baúles ilimitados</strong>
                </p>
              </div>
            </div>
          </button>

          {/* Premium plan */}
          <button
            onClick={() => setSelectedPlan('premium')}
            className={`w-full text-left bg-card rounded-2xl border-2 p-6 transition-all relative overflow-hidden ${
              selectedPlan === 'premium'
                ? 'border-primary shadow-lg'
                : 'border-border hover:border-border/60'
            }`}
          >
            {/* Subtle highlight for premium */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-primary" />
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-2xl font-serif text-foreground">Premium</h2>
                  <Crown className="w-5 h-5 text-primary" />
                  {currentPlan === 'premium' && (
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      Plan actual
                    </span>
                  )}
                </div>
                <p className="text-3xl font-serif text-foreground mb-1">5 €</p>
                <p className="text-sm text-muted-foreground">al mes</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selectedPlan === 'premium'
                  ? 'border-primary bg-primary'
                  : 'border-border'
              }`}>
                {selectedPlan === 'premium' && (
                  <Check className="w-4 h-4 text-background" />
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border my-4" />

            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Archive className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-foreground text-sm">
                  Hasta <strong>10 baúles</strong> como custodio
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <HardDrive className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-foreground text-sm">
                  <strong>50 GB</strong> por baúl custodiado
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-foreground text-sm">
                  Colabora en <strong>baúles ilimitados</strong>
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* CTA */}
        <Button
          variant="primary"
          fullWidth
          onClick={handleUpdatePlan}
          disabled={!isChangingPlan}
        >
          {isChangingPlan ? 'Actualizar mi plan' : 'Plan actual'}
        </Button>

        {/* Reassuring message */}
        <div className="mt-6 px-4">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            Puedes cambiar o cancelar cuando quieras. Sin compromisos.
          </p>
        </div>
      </div>
    </div>
  );
}
