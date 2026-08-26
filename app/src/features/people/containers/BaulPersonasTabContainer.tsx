import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { UserPlus } from 'lucide-react';
import { PersonasTab } from '@/features/people/components/PersonasTab';
import { NuevaPersonaModal } from '@/features/people/components/NuevaPersonaModal';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useAuthStore } from '@/store/useAuthStore';
import { createPersona } from '@/features/people/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { BaulRole, Persona } from '@/types';

interface BaulPersonasTabContainerProps {
  baulId: string;
  canCreatePersona: boolean;
}

// Self-sufficient tab: reads its own store slice and owns persona creation end to end, so
// BaulRoute (its only caller) doesn't need to know personas exist beyond mounting this.
// Navigates to the persona's own detail screen itself — that only needs baulId + persona.id,
// nothing route-context-dependent — see docs/architecture/frontend.md's containers/ rule.
export function BaulPersonasTabContainer({ baulId, canCreatePersona }: BaulPersonasTabContainerProps) {
  const navigate = useNavigate();
  const { personas } = usePersonasStore();
  const { userProfile } = useAuthStore();
  const { run, isPending } = useAsyncAction();
  const [showNuevaPersonaModal, setShowNuevaPersonaModal] = useState(false);

  const handleSelectPersona = (persona: Persona) => {
    navigate(`/baules/${baulId}/personas/${persona.id}`, { state: { returnTab: 'personas' } });
  };

  const handleSaveNuevaPersona = async (nickname: string, role: BaulRole) => {
    const result = await run(() => createPersona(baulId, nickname, role), { errorMessage: 'Error al añadir la persona' });
    if (result.ok) setShowNuevaPersonaModal(false);
  };

  return (
    <>
      <PersonasTab
        personas={personas[baulId] || []}
        currentUserEmail={userProfile.email}
        onSelectPersona={handleSelectPersona}
      />
      <SimpleFAB
        label="Nueva persona"
        icon={<UserPlus className="w-5 h-5" />}
        onClick={() => setShowNuevaPersonaModal(true)}
        hidden={!canCreatePersona}
      />
      {showNuevaPersonaModal && (
        <NuevaPersonaModal
          onCancel={() => setShowNuevaPersonaModal(false)}
          onSave={handleSaveNuevaPersona}
          isSubmitting={isPending()}
        />
      )}
    </>
  );
}
