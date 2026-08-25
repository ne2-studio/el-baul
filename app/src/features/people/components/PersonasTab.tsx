import React from 'react';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { Persona } from '@/types';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { SwimlaneLabel } from '@/design-system/components/data-display/SwimlaneLabel';
import { PersonaCard } from './PersonaCard';

interface PersonasTabProps {
  personas: Persona[];
  currentUserEmail?: string;
  onSelectPersona: (persona: Persona) => void;
}

function byNickname(a: Persona, b: Persona): number {
  return a.nickname.localeCompare(b.nickname, 'es');
}

export function PersonasTab({ personas, currentUserEmail, onSelectPersona }: PersonasTabProps) {
  const isMe = (persona: Persona) => !!currentUserEmail && persona.email === currentUserEmail;

  if (personas.length === 0) {
    return (
      <EmptyState
        icon={<Icon icon={icons.user} className="w-20 h-20" strokeWidth={1.5} aria-hidden />}
        title="Todavía no hay personas"
        subtitle="Añade a los miembros de tu familia para poder invitarles al baúl"
      />
    );
  }

  // Two swimlanes: baúl members (active) lead, other people (pending invitees) trail below.
  // Alphabetical within each group, except the current user always leads "Miembros del baúl".
  const miembros = personas
    .filter((persona) => persona.status === 'active')
    .sort((a, b) => (isMe(a) ? -1 : isMe(b) ? 1 : byNickname(a, b)));
  const otras = personas.filter((persona) => persona.status !== 'active').sort(byNickname);

  return (
    <div className="space-y-6">
      {miembros.length > 0 && (
        <PersonaSwimlane
          title="Miembros del baúl"
          personas={miembros}
          isMe={isMe}
          onSelectPersona={onSelectPersona}
        />
      )}
      {otras.length > 0 && (
        <PersonaSwimlane title="Otras personas" personas={otras} isMe={isMe} onSelectPersona={onSelectPersona} />
      )}
    </div>
  );
}

interface PersonaSwimlaneProps {
  title: string;
  personas: Persona[];
  isMe: (persona: Persona) => boolean;
  onSelectPersona: (persona: Persona) => void;
}

function PersonaSwimlane({ title, personas, isMe, onSelectPersona }: PersonaSwimlaneProps) {
  return (
    <div>
      <SwimlaneLabel>{title}</SwimlaneLabel>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {personas.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            onClick={() => onSelectPersona(persona)}
            isMe={isMe(persona)}
          />
        ))}
      </div>
    </div>
  );
}
