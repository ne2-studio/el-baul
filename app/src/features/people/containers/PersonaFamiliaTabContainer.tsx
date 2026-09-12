import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FamilyTreeView } from '@/features/people/components/FamilyTreeView';
import { usePersonasStore } from '@/store/usePersonasStore';
import { Persona } from '@/types';

interface PersonaFamiliaTabContainerProps {
  baulId: string;
  personaId: string;
}

// Self-sufficient tab: renders this persona's own branch of the family tree (their ancestors,
// descendants and co-parents — see buildPersonaFamilyTree), derived from the baúl-wide
// relationships list already loaded by usePersonaScope (PersonaDetailRoute's only caller
// doesn't need to know relationships exist beyond mounting this) — see
// docs/architecture/frontend.md's containers/ rule. Navigation is ID-only (which persona's
// ficha to open next), same pattern as BaulPersonasTabContainer.
export function PersonaFamiliaTabContainer({ baulId, personaId }: PersonaFamiliaTabContainerProps) {
  const navigate = useNavigate();
  const { personas, relationships, spouseRelationships } = usePersonasStore();
  const baulPersonas = personas[baulId] || [];
  const baulRelationships = relationships[baulId] || [];
  const baulSpouseRelationships = spouseRelationships[baulId] || [];

  const handleSelectPersona = (persona: Persona) => {
    navigate(`/baules/${baulId}/personas/${persona.id}`, { state: { returnTab: 'personas' } });
  };

  return (
    <FamilyTreeView
      personas={baulPersonas}
      relationships={baulRelationships}
      spouseRelationships={baulSpouseRelationships}
      focusPersonaId={personaId}
      onSelectPersona={handleSelectPersona}
    />
  );
}
