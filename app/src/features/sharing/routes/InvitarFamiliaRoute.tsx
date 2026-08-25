import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/api';
import { InvitarFamiliaScreen } from '@/features/sharing/components/InvitarFamiliaScreen';
import { NuevaPersonaModal } from '@/features/people/components/NuevaPersonaModal';
import { createPersona } from '@/features/people/useCases';
import { sharePublicLink } from '@/features/sharing/sharePublicLink';
import { useUIStore } from '@/store/uiStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulScope } from '@/hooks/useBaulScope';
import { guardBaulScope } from '@/hooks/baulScopeGuard';
import { Persona } from '@/types';

// "Invitar a la familia" full page — replaces the old InviteFamilyModal's single, baúl-wide
// link with a per-persona directed flow: one "Invitar" per Persona row, sharing that
// persona's own invite link. See PersonasController.Invite / PersonaInviteManager.
export const InvitarFamiliaRoute: React.FC = () => {
  const navigate = useNavigate();
  const { baulId } = useParams();
  const showToastMessage = useUIStore((state) => state.showToastMessage);
  const { run, isPending } = useAsyncAction();
  const [invitingPersonaId, setInvitingPersonaId] = useState<string | null>(null);
  const [showNuevaPersonaModal, setShowNuevaPersonaModal] = useState(false);

  const baulScope = useBaulScope(baulId);
  const guard = guardBaulScope(baulScope);
  if (!guard.ready) return guard.screen;
  const { baul } = guard;
  const personas = baulScope.personas || [];

  const shareInvite = async (persona: Persona) => {
    const invite = await api.baules.invitePersona(baul.id, persona.id);
    await sharePublicLink({
      title: `Invitación a ${baul.name}`,
      text: `Te invito a unirte a mi baúl de recuerdos "${baul.name}" en El Baúl, ${persona.nickname}.`,
      url: invite.url,
      onCopied: () => showToastMessage('Enlace copiado al portapapeles'),
    });
  };

  const handleInvite = async (persona: Persona) => {
    setInvitingPersonaId(persona.id);
    await run(() => shareInvite(persona), { key: `invite:${persona.id}`, errorMessage: 'Error al invitar' });
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
        />
      )}
    </>
  );
};
