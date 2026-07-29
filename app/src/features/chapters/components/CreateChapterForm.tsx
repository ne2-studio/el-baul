import React, { useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';

interface CreateChapterFormProps {
  onBack: () => void;
  onSubmit: (name: string) => void;
  isSubmitting?: boolean;
}

export function CreateChapterForm({ onBack, onSubmit, isSubmitting = false }: CreateChapterFormProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isSubmitting) {
      onSubmit(name);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <PageHeader variant="stacked" onBack={onBack} title="Nuevo capítulo" />

      {/* Form */}
      <PageContainer className="py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Nombre del capítulo"
            placeholder="Verano 2018"
            value={name}
            onChange={setName}
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            className="mt-8"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Crear capítulo
          </Button>
        </form>
      </PageContainer>
    </div>
  );
}
