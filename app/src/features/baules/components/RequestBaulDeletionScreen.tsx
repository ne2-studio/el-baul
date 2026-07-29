import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { Notice } from '@/design-system/components/feedback/Notice';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';

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
      <PageHeader variant="inline" onBack={onBack} backDisabled={isSubmitting} title="Eliminar baúl" />

      {/* Content */}
      <PageContainer className="py-8">
        <Notice
          variant="destructive"
          icon={<AlertTriangle className="w-4 h-4 text-destructive" />}
          className="mb-6"
        >
          Eliminar el baúl <span className="font-semibold">{baulName}</span> afecta a todas las personas que tienen
          acceso a él y conlleva la pérdida definitiva de sus fotos y recuerdos. Por eso, esta operación no se puede
          hacer directamente desde la app: cuéntanos tu caso y nuestro equipo de soporte lo gestionará contigo.
        </Notice>

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
      </PageContainer>
    </div>
  );
}
