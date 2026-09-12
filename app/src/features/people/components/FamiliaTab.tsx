import React from 'react';
import { FilterPills } from '@/design-system/components/navigation/FilterPills';
import { Persona, PersonaRelationship } from '@/types';
import { PersonasTab } from './PersonasTab';
import { FamilyTreeView } from './FamilyTreeView';

export type FamiliaView = 'mosaico' | 'arbol';

interface FamiliaTabProps {
  personas: Persona[];
  relationships: PersonaRelationship[];
  currentUserEmail?: string;
  view: FamiliaView;
  onViewChange: (view: FamiliaView) => void;
  onSelectPersona: (persona: Persona) => void;
}

const VIEW_OPTIONS: { value: FamiliaView; label: string }[] = [
  { value: 'mosaico', label: 'Mosaico' },
  { value: 'arbol', label: 'Árbol genealógico' },
];

// Pestaña "Familia" del baúl: Mosaico (PersonasTab, sin cambios de comportamiento) y Árbol
// genealógico (FamilyTreeView, nueva) son dos proyecciones distintas del mismo par
// personas+relaciones — ver la spec para por qué no hay una tercera fuente de verdad. Puramente
// presentacional: qué vista está activa y cómo se persiste vive en BaulPersonasTabContainer.
export function FamiliaTab({ personas, relationships, currentUserEmail, view, onViewChange, onSelectPersona }: FamiliaTabProps) {
  return (
    <div className="space-y-4">
      <FilterPills options={VIEW_OPTIONS} value={view} onChange={onViewChange} />

      {view === 'mosaico' ? (
        <PersonasTab personas={personas} currentUserEmail={currentUserEmail} onSelectPersona={onSelectPersona} />
      ) : (
        <FamilyTreeView
          personas={personas}
          relationships={relationships}
          onSelectPersona={onSelectPersona}
          onBackToMosaico={() => onViewChange('mosaico')}
        />
      )}
    </div>
  );
}
