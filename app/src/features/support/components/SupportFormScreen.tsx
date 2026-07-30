import React, { useState } from 'react';
import { CheckCircle, Info } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { Notice } from '@/design-system/components/feedback/Notice';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';

interface SupportFormScreenProps {
  title: string;
  onBack: () => void;
  onSubmit: (message: string) => Promise<void>;
}

export function SupportFormScreen({ title, onBack, onSubmit }: SupportFormScreenProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setHasError(false);
    try {
      await onSubmit(message.trim());
      setSucceeded(true);
    } catch {
      setHasError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (succeeded) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-primary" strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="text-3xl mb-3 text-foreground">Hemos recibido tu mensaje</h2>
          <p className="text-muted-foreground mb-12">
            Gracias por escribirnos. Lo revisaremos lo antes posible y te responderemos por correo electrónico.
          </p>
          <Button variant="primary" fullWidth onClick={onBack}>
            Cerrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader variant="inline" onBack={onBack} backDisabled={isSubmitting} title={title} />

      {/* Content */}
      <PageContainer className="py-8">
        <Input
          aria-label="Mensaje"
          value={message}
          onChange={setMessage}
          placeholder="Cuéntanos qué ha pasado o cómo podemos ayudarte."
          disabled={isSubmitting}
          rows={5}
          multiline
          variant="support"
          className="mb-4"
          autoFocus
        />

        <Notice icon={<Info className="w-4 h-4 text-muted-foreground" />} className="mb-6">
          Recopilaremos algunos datos técnicos para poder ayudarte más rápido.
        </Notice>

        {hasError && (
          <p className="text-sm text-destructive mb-4">
            No hemos podido enviar tu mensaje. Inténtalo de nuevo dentro de unos minutos.
          </p>
        )}

        <Button
          variant="primary"
          fullWidth
          onClick={handleSubmit}
          disabled={!message.trim() || isSubmitting}
          isLoading={isSubmitting}
        >
          Enviar
        </Button>
      </PageContainer>
    </div>
  );
}
