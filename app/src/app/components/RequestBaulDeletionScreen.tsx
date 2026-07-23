import React, { useState } from 'react';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface RequestBaulDeletionScreenProps {
  baulName: string;
  onBack: () => void;
  onSubmit: (reason: string) => void;
  isSubmitting?: boolean;
}

export function RequestBaulDeletionScreen({ baulName, onBack, onSubmit, isSubmitting = false }: RequestBaulDeletionScreenProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim() || isSubmitting) return;
    onSubmit(reason.trim());
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-4">
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors -ml-2 disabled:opacity-50"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-3xl text-foreground">Eliminar baúl</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-start gap-3 bg-destructive/8 border border-destructive/20 rounded-xl p-4 mb-6">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive/80 leading-relaxed">
            Eliminar el baúl <span className="font-semibold">{baulName}</span> afecta a todas las personas que tienen
            acceso a él y conlleva la pérdida definitiva de sus fotos y recuerdos. Por eso, esta operación no se puede
            hacer directamente desde la app: cuéntanos tu caso y nuestro equipo de soporte lo gestionará contigo.
          </p>
        </div>

        <label className="block text-sm font-medium text-foreground mb-2">
          Explica la situación y el motivo por el que deseas eliminar el baúl
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Cuéntanos qué ha pasado y por qué quieres eliminar este baúl."
          disabled={isSubmitting}
          className="w-full min-h-[160px] p-4 bg-card border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all text-foreground placeholder:text-muted-foreground mb-6 disabled:opacity-60"
          autoFocus
        />

        <Button
          variant="danger"
          fullWidth
          onClick={handleSubmit}
          disabled={!reason.trim() || isSubmitting}
          isLoading={isSubmitting}
        >
          Enviar solicitud
        </Button>
      </div>
    </div>
  );
}
