import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { InvitarFamiliaScreen } from '@/features/sharing/components/InvitarFamiliaScreen';
import { NuevaPersonaModal } from '@/features/people/components/NuevaPersonaModal';
import { createPersona, sharePersonaInvite } from '@/features/people/useCases';
import { useUIStore } from '@/store/uiStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { guardBaulScope } from '@/hooks/baulScopeGuard';
import { Persona } from '@/types';
import { usePostHog } from 'posthog-js/react';

// "Invitar a la familia" full page — replaces the old InviteFamilyModal's single, baúl-wide
// link with a per-persona directed flow: one "Invitar" per Persona row, sharing that
// persona's own invite link. See PersonasController.Invite / PersonaInviteManager.
export const InvitarFamiliaRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const showToastMessage = useUIStore((state) => state.showToastMessage);
  const { run, isPending } = useAsyncAction();
  const posthog = usePostHog();
  const [invitingPersonaId, setInvitingPersonaId] = useState<string | null>(null);
  const [showNuevaPersonaModal, setShowNuevaPersonaModal] = useState(false);

  const baulScope = useBaulScope(baulId);
  const guard = guardBaulScope(baulScope);
  if (!guard.ready) return guard.screen;
  const { baul } = guard;
  const personas = baulScope.personas || [];

  const handleInvite = async (persona: Persona) => {
    setInvitingPersonaId(persona.id);
    const result = await run(
      () => sharePersonaInvite(baul, persona, () => showToastMessage('Enlace copiado al portapapeles')),
      { key: `invite:${persona.id}`, errorMessage: 'Error al invitar' },
    );
    if (result.ok) posthog.capture('family_invite_shared', { context: 'new' });
    setInvitingPersonaId(null);
  };

  const handleSaveNuevaPersona = async (nickname: string) => {
    const result = await run(() => createPersona(baul.id, nickname), { errorMessage: 'Error al añadir la persona' });
    if (!result.ok) return;
    setShowNuevaPersonaModal(false);
    await handleInvite(result.value);
  };

  return (
    <>
      <InvitarFamiliaScreen
        baulNombre={baul.name}
        personas={personas}
        invitingPersonaId={invitingPersonaId}
        onInvite={handleInvite}
        onAddPersona={() => setShowNuevaPersonaModal(true)}
        onBack={() => navigate(`/baules/${baul.id}`)}
      />
      {showNuevaPersonaModal && (
        <NuevaPersonaModal
          onCancel={() => setShowNuevaPersonaModal(false)}
          onSave={handleSaveNuevaPersona}
          isSubmitting={isPending()}
          showAccessSelector={false}
        />
      )}
    </>
  );
};
