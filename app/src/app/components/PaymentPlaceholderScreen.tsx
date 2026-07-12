import React from 'react';
import { ChevronLeft, Lock, CreditCard } from 'lucide-react';
import { Button } from './Button';
import { PlanType } from './MiSuscripcionScreen';

interface PaymentPlaceholderScreenProps {
  onBack: () => void;
  selectedPlan: PlanType;
  onComplete: () => void;
}

export function PaymentPlaceholderScreen({ onBack, selectedPlan, onComplete }: PaymentPlaceholderScreenProps) {
  const isPremium = selectedPlan === 'premium';
  
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
          <h1 className="text-3xl text-foreground">Pago seguro</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-serif text-foreground text-center mb-4">
          {isPremium ? 'Plan Premium' : 'Plan Gratuito'}
        </h2>

        {/* Price */}
        {isPremium && (
          <div className="text-center mb-8">
            <p className="text-4xl font-serif text-foreground mb-2">5 €</p>
            <p className="text-muted-foreground">al mes</p>
          </div>
        )}

        {/* Payment info card */}
        <div className="bg-card rounded-2xl border border-border p-8 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Lock className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground mb-2">Pasarela de pago segura</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Serás redirigido a una pasarela de pago segura para completar tu suscripción.
              </p>
            </div>
          </div>

          <div className="border-t border-border my-4" />

          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            Tus datos de pago están protegidos y encriptados. No guardamos información de tarjetas.
          </p>
        </div>

        {/* CTA - Simulated for prototype */}
        <Button
          variant="primary"
          fullWidth
          onClick={onComplete}
          className="mb-4"
        >
          Continuar al pago
        </Button>

        <Button
          variant="secondary"
          fullWidth
          onClick={onBack}
        >
          Volver
        </Button>

        {/* Reassuring text */}
        <div className="mt-8 px-4">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Esta es una pantalla de demostración. En la aplicación real, serías redirigido a un proveedor de pagos seguro.
          </p>
        </div>
      </div>
    </div>
  );
}
