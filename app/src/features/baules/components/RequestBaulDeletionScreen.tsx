import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
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

        <Input
          label="Explica la situación y el motivo por el que deseas eliminar el baúl"
          value={reason}
          onChange={setReason}
          placeholder="Cuéntanos qué ha pasado y por qué quieres eliminar este baúl."
          disabled={isSubmitting}
          rows={5}
          multiline
          variant="support"
          className="mb-6"
          labelClassName="block text-sm font-medium text-foreground"
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
