import React from 'react';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { Persona } from '@/types';
import { Card } from '@/design-system/components/data-display/Card';

interface PersonaCardProps {
  persona: Persona;
  onClick: () => void;
  /** true cuando la persona es el usuario actual, para mostrar "Tú" en lugar de su nickname. */
  isMe?: boolean;
  /** true para personas sin acceso al baúl, se muestran atenuadas. */
  muted?: boolean;
}

export function PersonaCard({ persona, onClick, isMe = false, muted = false }: PersonaCardProps) {
  return (
    <Card onClick={onClick} className="!p-0 overflow-hidden">
      <div className={`aspect-square bg-secondary flex items-center justify-center overflow-hidden ${muted ? 'opacity-70 grayscale' : ''}`}>
        {persona.avatarUrl ? (
          <img src={persona.avatarUrl} alt={persona.nickname} className="w-full h-full object-cover" />
        ) : persona.isCustodio ? (
          <Icon icon={icons.crown} className="w-10 h-10 text-primary opacity-60" strokeWidth={1.5} aria-hidden />
        ) : (
          <Icon icon={icons.user} className="w-10 h-10 text-muted-foreground opacity-40" strokeWidth={1.5} aria-hidden />
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-foreground text-center truncate">
          {isMe ? 'Tú' : persona.nickname}
        </p>
      </div>
    </Card>
  );
}
