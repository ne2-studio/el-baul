import React, { useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';

interface CreateBaulFormProps {
  onBack: () => void;
  onSubmit: (name: string, description: string) => void;
  isOnboarding?: boolean;
  isSubmitting?: boolean;
}

export function CreateBaulForm({ onBack, onSubmit, isOnboarding = false, isSubmitting = false }: CreateBaulFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;
    onSubmit(trimmedName, description.trim());
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="stacked"
        onBack={onBack}
        backDisabled={isSubmitting}
        title={isOnboarding ? 'Crea tu primer baúl' : 'Crear un baúl'}
      />
      <PageContainer className="py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Nombre del baúl"
            placeholder={isOnboarding ? 'Familia, Viajes, Recuerdos importantes...' : 'Familia Jimena'}
            value={name}
            onChange={setName}
            autoFocus
          />
          <Input
            label="Descripción (opcional)"
            placeholder="Nuestros momentos en familia..."
            value={description}
            onChange={setDescription}
            multiline
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            {isOnboarding
              ? 'Podrás crear más baúles más adelante'
              : 'Puedes tener varios baúles para distintas etapas o personas'}
          </p>
          <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting} disabled={!name.trim() || isSubmitting}>
            Crear baúl
          </Button>
        </form>
      </PageContainer>
    </div>
  );
}
