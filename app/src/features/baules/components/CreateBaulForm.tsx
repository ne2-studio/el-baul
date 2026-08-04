import React, { useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';

interface CreateBaulFormProps {
  onBack: () => void;
  onSubmit: (name: string) => void;
  initialName: string;
  isSubmitting?: boolean;
}

export function CreateBaulForm({ onBack, onSubmit, initialName, isSubmitting = false }: CreateBaulFormProps) {
  const [name, setName] = useState(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;
    onSubmit(trimmedName);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="stacked"
        onBack={onBack}
        backDisabled={isSubmitting}
        title="Ponle un nombre a vuestro Baúl"
        subtitle="Será el lugar donde guardaréis vuestros recuerdos familiares durante muchos años."
      />
      <PageContainer className="py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-3 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BaulIcon className="w-7 h-7 text-primary" />
            </div>
            <p className="text-lg font-medium text-foreground text-center">
              {name.trim() || 'Vuestro Baúl'}
            </p>
          </div>

          <Input
            label="¿Cómo queréis llamarlo?"
            value={name}
            onChange={setName}
            helperText="Puedes cambiar el nombre cuando quieras."
            autoFocus
          />

          <div className="space-y-3">
            <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting} disabled={!name.trim() || isSubmitting}>
              Continuar
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              En el siguiente paso añadirás las primeras fotos del Baúl.
            </p>
          </div>
        </form>
      </PageContainer>
    </div>
  );
}
