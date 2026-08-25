import React from 'react';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { Persona } from '@/types';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { PersonaCard } from './PersonaCard';

interface PersonasTabProps {
  personas: Persona[];
  currentUserEmail?: string;
  onSelectPersona: (persona: Persona) => void;
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

  // No more "Sin acceso" swimlane — a persona is either in the baúl (active) or still
  // Pending, both shown together, same as before this ticket removed that third state.
  return (
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
  );
}
