import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PersonaFamiliaTab } from '@/features/people/components/PersonaFamiliaTab';
import { usePersonasStore } from '@/store/usePersonasStore';
import { getChildren, getParents } from '@/utils/personaRelationships';
import { Persona } from '@/types';

interface PersonaFamiliaTabContainerProps {
  baulId: string;
  personaId: string;
}

// Self-sufficient tab: derives this persona's parents/children from the baúl-wide relationships
// list already loaded by usePersonaScope (PersonaDetailRoute's only caller doesn't need to know
// relationships exist beyond mounting this) — see docs/architecture/frontend.md's containers/
// rule. Navigation is ID-only (which persona's ficha to open next), same pattern as
// BaulPersonasTabContainer.
export function PersonaFamiliaTabContainer({ baulId, personaId }: PersonaFamiliaTabContainerProps) {
  const navigate = useNavigate();
  const { personas, relationships } = usePersonasStore();
  const baulPersonas = personas[baulId] || [];
  const baulRelationships = relationships[baulId] || [];

  const handleSelectPersona = (persona: Persona) => {
    navigate(`/baules/${baulId}/personas/${persona.id}`, { state: { returnTab: 'personas' } });
  };

  return (
    <PersonaFamiliaTab
      parents={getParents(baulRelationships, baulPersonas, personaId)}
      children={getChildren(baulRelationships, baulPersonas, personaId)}
      onSelectPersona={handleSelectPersona}
    />
  );
}
