import React, { useState } from 'react';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { Persona } from '@/types';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { SwimlaneLabel } from '@/design-system/components/data-display/SwimlaneLabel';
import { Button } from '@/design-system/components/actions/Button';
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

  // Three swimlanes: baúl members (active) lead, then pending invitees with access, then
  // pending people without access ("Sin acceso") at the bottom, collapsed by default.
  // Alphabetical within each group, except the current user always leads "Miembros del baúl".
  const miembros = personas
    .filter((persona) => persona.status === 'active')
    .sort((a, b) => (isMe(a) ? -1 : isMe(b) ? 1 : byNickname(a, b)));
  const pendientes = personas
    .filter((persona) => persona.status !== 'active' && persona.role !== 'sin_acceso')
    .sort(byNickname);
  const sinAcceso = personas
    .filter((persona) => persona.status !== 'active' && persona.role === 'sin_acceso')
    .sort(byNickname);

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
      {pendientes.length > 0 && (
        <PersonaSwimlane
          title="Pendientes de unirse"
          personas={pendientes}
          isMe={isMe}
          onSelectPersona={onSelectPersona}
        />
      )}
      {sinAcceso.length > 0 && (
        <SinAccesoSwimlane personas={sinAcceso} isMe={isMe} onSelectPersona={onSelectPersona} />
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

/** Group 3, "Sin acceso": collapsed by default and using the muted card style, since these
 * are people the baúl deliberately excluded from access rather than people yet to join. */
function SinAccesoSwimlane({ personas, isMe, onSelectPersona }: Omit<PersonaSwimlaneProps, 'title'>) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <Button
        variant="plain"
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1 mb-3 -ml-0.5 px-0.5 py-0.5 rounded"
        aria-expanded={expanded}
      >
        <Icon
          icon={icons.chevronDown}
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded ? '' : '-rotate-90'}`}
          strokeWidth={2}
          aria-hidden
        />
        <p
          className="text-xs text-muted-foreground uppercase tracking-wide"
          style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
        >
          Sin acceso
        </p>
      </Button>
      {expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {personas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              onClick={() => onSelectPersona(persona)}
              isMe={isMe(persona)}
              muted
            />
          ))}
        </div>
      )}
    </div>
  );
}
