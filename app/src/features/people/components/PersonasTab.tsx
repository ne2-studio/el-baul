import React from 'react';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { Persona } from '@/types';
import { Card } from '@/design-system/components/data-display/Card';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { getBaulPermissions } from '@/utils/roleUtils';

interface PersonasTabProps {
  personas: Persona[];
  currentUserEmail?: string;
  onSelectPersona: (persona: Persona) => void;
}

export function PersonasTab({ personas, currentUserEmail, onSelectPersona }: PersonasTabProps) {
  const hasNoAccess = (persona: Persona) => persona.role === 'sin_acceso' || persona.status === 'sin_acceso';
  const personasWithAccess = personas.filter((persona) => !hasNoAccess(persona));
  const personasWithoutAccess = personas.filter(hasNoAccess);

  if (personas.length === 0) {
    return (
      <EmptyState
        icon={<Icon icon={icons.user} className="w-20 h-20" strokeWidth={1.5} aria-hidden />}
        title="Todavía no hay personas"
        subtitle="Añade a los miembros de tu familia para poder invitarles al baúl"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PersonaSwimlane
        title="Con acceso"
        personas={personasWithAccess}
        currentUserEmail={currentUserEmail}
        onSelectPersona={onSelectPersona}
      />
      {personasWithoutAccess.length > 0 && (
        <PersonaSwimlane
          title="Sin acceso"
          personas={personasWithoutAccess}
          currentUserEmail={currentUserEmail}
          onSelectPersona={onSelectPersona}
          muted
        />
      )}
    </div>
  );
}

interface PersonaSwimlaneProps {
  title: string;
  personas: Persona[];
  currentUserEmail?: string;
  onSelectPersona: (persona: Persona) => void;
  muted?: boolean;
}

function PersonaSwimlane({ title, personas, currentUserEmail, onSelectPersona, muted = false }: PersonaSwimlaneProps) {
  const isMe = (persona: Persona) => !!currentUserEmail && persona.email === currentUserEmail;

  if (personas.length === 0) return null;

  return (
    <div>
      <p
        className="text-xs text-muted-foreground uppercase tracking-wide mb-3"
        style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
      >
        {title}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {personas.map((persona) => (
          <Card key={persona.id} onClick={() => onSelectPersona(persona)} className="!p-0 overflow-hidden">
            <div className={`aspect-square bg-secondary flex items-center justify-center overflow-hidden ${muted ? 'opacity-70 grayscale' : ''}`}>
              {persona.avatarUrl ? (
                <img src={persona.avatarUrl} alt={persona.nickname} className="w-full h-full object-cover" />
              ) : getBaulPermissions({ role: persona.role }).isCustodio ? (
                <Icon icon={icons.crown} className="w-10 h-10 text-primary opacity-60" strokeWidth={1.5} aria-hidden />
              ) : (
                <Icon icon={icons.user} className="w-10 h-10 text-muted-foreground opacity-40" strokeWidth={1.5} aria-hidden />
              )}
            </div>
            <div className="p-3">
              <p className="font-medium text-foreground text-center truncate">
                {isMe(persona) ? 'Tú' : persona.nickname}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
