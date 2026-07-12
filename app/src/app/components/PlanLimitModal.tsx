import React from 'react';
import { X, Archive, Heart } from 'lucide-react';
import { Button } from './Button';

interface PlanLimitModalProps {
  onClose: () => void;
  onUpgradePlan: () => void;
  baulesUsed: number;
  baulesLimit: number;
}

export function PlanLimitModal({ onClose, onUpgradePlan, baulesUsed, baulesLimit }: PlanLimitModalProps) {
  return (
    <div className="fixed inset-0 bg-foreground/40 z-50 flex items-end md:items-center md:justify-center p-4">
      {/* Modal */}
      <div 
        className="bg-background w-full md:max-w-md rounded-3xl shadow-2xl animate-slide-up md:animate-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h2 className="font-serif text-2xl text-foreground mb-2">
                No puedes crear más baúles
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Icon and message */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Archive className="w-8 h-8 text-primary" />
            </div>
            
            <p className="text-foreground leading-relaxed mb-3">
              Has alcanzado el límite de <strong>{baulesLimit} baúles</strong> de tu plan actual.
            </p>
            
            {/* Emotional, reassuring message */}
            <div className="bg-muted/50 rounded-xl p-4 w-full">
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed text-left">
                  Actualiza tu plan para seguir guardando recuerdos importantes y compartirlos con las personas que amas.
                </p>
              </div>
            </div>
          </div>

          {/* Current usage */}
          <div className="bg-card rounded-xl border border-border p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Baúles custodiados</span>
              <span className="font-medium text-foreground">{baulesUsed} / {baulesLimit}</span>
            </div>
            
            {/* Progress bar */}
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(baulesUsed / baulesLimit) * 100}%` }}
              />
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Button
              variant="primary"
              fullWidth
              onClick={onUpgradePlan}
            >
              Actualizar mi plan
            </Button>
            
            <Button
              variant="secondary"
              fullWidth
              onClick={onClose}
            >
              Volver
            </Button>
          </div>
        </div>

        {/* Bottom padding for mobile */}
        <div className="h-4 md:hidden" />
      </div>
    </div>
  );
}
