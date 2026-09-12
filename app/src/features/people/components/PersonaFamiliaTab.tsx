import React from 'react';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { Persona } from '@/types';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { SwimlaneLabel } from '@/design-system/components/data-display/SwimlaneLabel';
import { PersonaCard } from './PersonaCard';

interface PersonaFamiliaTabProps {
  parents: Persona[];
  children: Persona[];
  onSelectPersona: (persona: Persona) => void;
}

// v1 of the family graph, read-only here — editing lives in "Editar relaciones" (the "···"
// menu, see PersonaSettingsMenuContainer). Just two groups, no tree yet — see the feature spec
// for why this stays deliberately minimal.
export function PersonaFamiliaTab({ parents, children, onSelectPersona }: PersonaFamiliaTabProps) {
  if (parents.length === 0 && children.length === 0) {
    return (
      <EmptyState
        icon={<Icon icon={icons.users} className="w-20 h-20" strokeWidth={1.5} aria-hidden />}
        title="Todavía no hay relaciones familiares"
        subtitle='Añade padres, madres, hijos o hijas desde "Editar relaciones"'
      />
    );
  }

  return (
    <div className="space-y-6">
      {parents.length > 0 && (
        <FamiliaGroup title="Padres" personas={parents} onSelectPersona={onSelectPersona} />
      )}
      {children.length > 0 && (
        <FamiliaGroup title="Hijos" personas={children} onSelectPersona={onSelectPersona} />
      )}
    </div>
  );
}

interface FamiliaGroupProps {
  title: string;
  personas: Persona[];
  onSelectPersona: (persona: Persona) => void;
}

function FamiliaGroup({ title, personas, onSelectPersona }: FamiliaGroupProps) {
  return (
    <div>
      <SwimlaneLabel>{title}</SwimlaneLabel>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {personas.map((persona) => (
          <PersonaCard key={persona.id} persona={persona} onClick={() => onSelectPersona(persona)} />
        ))}
      </div>
    </div>
  );
}
