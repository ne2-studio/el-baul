import React from 'react';
import { UserPlus } from 'lucide-react';
import { Card } from '@/design-system/components/data-display/Card';
import { Avatar } from '@/design-system/components/data-display/Avatar';
import { ActionListItem } from '@/design-system/components/data-display/ActionListItem';
import { Button } from '@/design-system/components/actions/Button';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { PageHeader } from '@/design-system/layouts/PageHeader';
import { Persona } from '@/types';
import { sortPersonasForInvite } from '@/utils/personaOrder';

interface InvitarFamiliaScreenProps {
  baulNombre: string;
  personas: Persona[];
  invitingPersonaId: string | null;
  onInvite: (persona: Persona) => void;
  onAddPersona: () => void;
  onBack: () => void;
}

// "Invitar a la familia" — replaces the old one-link-fits-all modal with a directed, per-person
// flow: every persona in the baúl gets its own card (same Avatar + nickname + name pattern as
// the old ClaimPersonaScreen's "¿quién eres tú?" step) and its own "Invitar" CTA, which shares
// that persona's own invite link. Already-active personas show a disabled "Ya está dentro"
// state instead. "Invitar a otra persona" at the end covers a family member who isn't in the
// baúl's Personas list yet.
export function InvitarFamiliaScreen({
  baulNombre,
  personas,
  invitingPersonaId,
  onInvite,
  onAddPersona,
  onBack,
}: InvitarFamiliaScreenProps) {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="stacked"
        onBack={onBack}
        title="Invitar a la familia"
        subtitle={`Elige a quién invitar a ${baulNombre}`}
      />

      <PageContainer className="py-6 pb-24 space-y-3">
        {sortPersonasForInvite(personas).map((persona) => {
          const isActive = persona.status === 'active';
          const isInviting = invitingPersonaId === persona.id;

          return (
            <div key={persona.id} data-testid={`persona-invite-${persona.id}`}>
              <Card className="flex items-center gap-4">
                <Avatar name={persona.nickname} src={persona.avatarUrl} size={14} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-foreground text-lg leading-tight truncate">{persona.nickname}</h3>
                  {persona.name && <p className="text-muted-foreground text-xs mt-0.5 truncate">{persona.name}</p>}
                </div>
                <Button
                  variant={isActive ? 'secondary' : 'primary'}
                  disabled={isActive || isInviting}
                  isLoading={isInviting}
                  onClick={() => onInvite(persona)}
                  className="rounded-full px-4 py-2 text-sm flex-shrink-0"
                >
                  {isActive ? 'Ya está dentro' : 'Invitar'}
                </Button>
              </Card>
            </div>
          );
        })}

        <ActionListItem
          variant="card"
          icon={<UserPlus className="w-5 h-5" aria-hidden />}
          title="Invitar a otra persona"
          description="Añade a alguien que todavía no está en la lista"
          onClick={onAddPersona}
        />
      </PageContainer>
    </div>
  );
}
