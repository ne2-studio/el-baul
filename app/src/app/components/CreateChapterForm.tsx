import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { PageContainer } from './PageContainer';
import { StickyHeader } from './StickyHeader';
import { ChevronLeft } from 'lucide-react';

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
      {/* Header */}
      <StickyHeader>
        <PageContainer className="py-5">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Volver</span>
          </button>
          <h1 className="text-3xl text-foreground">Nuevo capítulo</h1>
        </PageContainer>
      </StickyHeader>

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
