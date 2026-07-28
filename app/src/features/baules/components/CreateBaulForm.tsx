import React, { useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { StickyHeader } from '@/design-system/layouts/StickyHeader';
import { ChevronLeft } from 'lucide-react';

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
    if (name.trim() && !isSubmitting) {
      onSubmit(name, description);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <StickyHeader>
        <PageContainer className="py-5">
          <Button variant="plain"
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Volver</span>
          </Button>
          <h1 className="text-3xl text-foreground">
            {isOnboarding ? 'Crea tu primer baúl' : 'Crear un baúl'}
          </h1>
        </PageContainer>
      </StickyHeader>

      {/* Form */}
      <PageContainer className="py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Nombre del baúl"
            placeholder={isOnboarding ? 'Familia, Viajes, Recuerdos importantes...' : 'Familia Jimena'}
            value={name}
            onChange={setName}
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
              : 'Puedes tener varios baúles para distintas etapas o personas'
            }
          </p>
          
          <Button
            type="submit"
            variant="primary"
            fullWidth
            className="mt-8"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Crear baúl
          </Button>
        </form>
      </PageContainer>
    </div>
  );
}