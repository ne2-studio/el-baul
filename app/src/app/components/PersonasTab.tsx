import React from 'react';
import { Crown, User as UserIcon } from 'lucide-react';
import { Persona } from '@/types';
import { Card } from './Card';
import { EmptyState } from './EmptyState';

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
        icon={<UserIcon className="w-20 h-20" strokeWidth={1.5} />}
        title="Todavía no hay personas"
        subtitle="Añade a los miembros de tu familia para poder invitarles al baúl"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {personas.map((persona) => (
        <Card key={persona.id} onClick={() => onSelectPersona(persona)} className="!p-0 overflow-hidden">
          <div className="aspect-square bg-secondary flex items-center justify-center overflow-hidden">
            {persona.avatarUrl ? (
              <img src={persona.avatarUrl} alt={persona.nickname} className="w-full h-full object-cover" />
            ) : persona.role === 'custodio' ? (
              <Crown className="w-10 h-10 text-primary opacity-60" strokeWidth={1.5} />
            ) : (
              <UserIcon className="w-10 h-10 text-muted-foreground opacity-40" strokeWidth={1.5} />
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
  );
}
