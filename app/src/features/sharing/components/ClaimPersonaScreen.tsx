import React from 'react';
import { UserPlus } from 'lucide-react';
import { Card } from '@/design-system/components/data-display/Card';
import { ActionListItem } from '@/design-system/components/data-display/ActionListItem';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { ClaimablePersona } from '@/types';

interface ClaimPersonaScreenProps {
  baulNombre: string;
  personas: ClaimablePersona[];
  onSelectPersona: (persona: ClaimablePersona) => void;
  onNotListed: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ClaimPersonaScreen({
  baulNombre,
  personas,
  onSelectPersona,
  onNotListed,
  onCancel,
  isSubmitting = false,
}: ClaimPersonaScreenProps) {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="stacked"
        onBack={onCancel}
        backLabel="Cancelar"
        title="¿Quién eres tú?"
        subtitle={`Elige tu perfil en ${baulNombre}`}
      />

      <PageContainer className="py-6 pb-24 space-y-3">
        {personas.map((persona) => (
          <Card
            key={persona.id}
            onClick={isSubmitting ? undefined : () => onSelectPersona(persona)}
            className="flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center">
              {persona.avatarUrl ? (
                <img src={persona.avatarUrl} alt={persona.nickname} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg text-muted-foreground">{persona.nickname.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-foreground text-lg leading-tight truncate">{persona.nickname}</h3>
              {persona.name && <p className="text-muted-foreground text-xs mt-0.5 truncate">{persona.name}</p>}
            </div>
          </Card>
        ))}

        <ActionListItem
          variant="card"
          icon={<UserPlus className="w-5 h-5" aria-hidden />}
          title="No soy ninguna de las personas anteriores"
          description="Se creará un perfil nuevo para ti"
          onClick={onNotListed}
          disabled={isSubmitting}
        />
      </PageContainer>
    </div>
  );
}
