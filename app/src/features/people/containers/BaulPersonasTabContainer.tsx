import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePostHog } from 'posthog-js/react';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { UserPlus } from 'lucide-react';
import { FamiliaTab, FamiliaView } from '@/features/people/components/FamiliaTab';
import { NuevaPersonaModal } from '@/features/people/components/NuevaPersonaModal';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useAuthStore } from '@/store/useAuthStore';
import { createPersona, loadPersonaRelationships, loadPersonaSpouseRelationships } from '@/features/people/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { readString, writeString } from '@/utils/safeLocalStorage';
import { BaulRole, Persona } from '@/types';

interface BaulPersonasTabContainerProps {
  baulId: string;
  canCreatePersona: boolean;
}

// Qué vista de Familia se enseña la próxima vez que se entra al baúl — ver "Persistencia de la
// vista" en la spec del árbol genealógico. Global (no por baúl): una preferencia de cómo se
// prefiere ver "Familia", no un dato propio de un baúl concreto.
const FAMILIA_VIEW_STORAGE_KEY = 'elbaul.familiaView';

function isFamiliaView(value: string | null): value is FamiliaView {
  return value === 'mosaico' || value === 'arbol';
}

// Self-sufficient tab: reads its own store slice and owns persona creation end to end, so
// BaulRoute (its only caller) doesn't need to know personas exist beyond mounting this.
// Navigates to the persona's own detail screen itself — that only needs baulId + persona.id,
// nothing route-context-dependent — see docs/architecture/frontend.md's containers/ rule.
export function BaulPersonasTabContainer({ baulId, canCreatePersona }: BaulPersonasTabContainerProps) {
  const navigate = useNavigate();
  const { personas, relationships, spouseRelationships } = usePersonasStore();
  const { userProfile } = useAuthStore();
  const { run, isPending } = useAsyncAction();
  const posthog = usePostHog();
  const [showNuevaPersonaModal, setShowNuevaPersonaModal] = useState(false);
  const [view, setView] = useState<FamiliaView>(() => {
    const stored = readString(FAMILIA_VIEW_STORAGE_KEY);
    return isFamiliaView(stored) ? stored : 'mosaico';
  });

  const baulRelationships = relationships[baulId];
  const baulSpouseRelationships = spouseRelationships[baulId];
  useEffect(() => {
    // El Mosaico no necesita las relaciones — solo se piden para que el Árbol genealógico
    // pueda proyectarlas (ver FamilyTreeView/buildFamilyTree), pero se cargan de una vez al
    // entrar en "Familia" en vez de esperar a que se cambie de vista, igual que el resto de
    // pestañas del baúl precargan su propio scope.
    if (baulRelationships === undefined) loadPersonaRelationships(baulId).catch(() => undefined);
    if (baulSpouseRelationships === undefined) loadPersonaSpouseRelationships(baulId).catch(() => undefined);
  }, [baulId, baulRelationships, baulSpouseRelationships]);

  const handleViewChange = (nextView: FamiliaView) => {
    setView(nextView);
    writeString(FAMILIA_VIEW_STORAGE_KEY, nextView);
    posthog.capture('family_view_changed', { view: nextView });
  };

  const handleSelectPersona = (persona: Persona) => {
    navigate(`/baules/${baulId}/personas/${persona.id}`, {
      state: { returnTab: 'personas', ...(view === 'arbol' && { source: 'family_tree' }) },
    });
  };

  const handleSaveNuevaPersona = async (nickname: string, role: BaulRole) => {
    const result = await run(() => createPersona(baulId, nickname, role), { errorMessage: 'Error al añadir la persona' });
    if (result.ok) {
      posthog.capture('persona_created', { role });
      setShowNuevaPersonaModal(false);
    }
  };

  return (
    <>
      <FamiliaTab
        personas={personas[baulId] || []}
        relationships={baulRelationships || []}
        spouseRelationships={baulSpouseRelationships || []}
        currentUserEmail={userProfile.email}
        view={view}
        onViewChange={handleViewChange}
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
