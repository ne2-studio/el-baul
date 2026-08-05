import React, { useState } from 'react';
import { BookOpen, Pencil } from 'lucide-react';
import { EmptyState } from '@/design-system/components/feedback/EmptyState';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { EditBiografiaModal } from '@/features/people/components/EditBiografiaModal';
import { Persona } from '@/types';
import { getPersonaPermissions } from '@/utils/roleUtils';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { updatePersonaBiografia } from '@/features/people/useCases';

interface PersonaBiografiaTabContainerProps {
  baulId: string;
  persona: Persona;
}

// Self-sufficient tab: owns the "Editar biografía" FAB and its modal end to end. Biografía
// is shared, wiki-like content — the permission to edit it depends only on the viewer's own
// role in the baúl, not on this persona, so it's computed here from a self-lookup instead of
// coming in as a prop — see docs/architecture/frontend.md's containers/ rule.
export function PersonaBiografiaTabContainer({ baulId, persona }: PersonaBiografiaTabContainerProps) {
  const { baules } = useBaulesStore();
  const { run, isPending } = useAsyncAction();
  const [isEditingBiografia, setIsEditingBiografia] = useState(false);

  const currentBaulRole = baules.find((b) => b.id === baulId)?.role;
  const canEditBiografia = getPersonaPermissions({ currentBaulRole, persona }).canEditPersonaBiography;

  const handleSaveBiografia = async (biografia: string) => {
    const result = await run(() => updatePersonaBiografia(baulId, persona.id, biografia), {
      key: 'save',
      successMessage: 'Biografía actualizada',
      errorMessage: 'Error al actualizar la biografía',
    });
    if (result.ok) setIsEditingBiografia(false);
  };

  return (
    <>
      {persona.biografia ? (
        <div className="bg-card rounded-2xl border border-border p-6">
          <p
            className="text-xs text-muted-foreground uppercase tracking-wide mb-4"
            style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
          >
            Biografía
          </p>
          <p className="text-foreground whitespace-pre-wrap">{persona.biografia}</p>
        </div>
      ) : (
        <EmptyState
          icon={<BookOpen className="w-20 h-20" strokeWidth={1.5} />}
          title="Todavía no hay biografía"
          subtitle={`Este usuario aún no tiene biografía${canEditBiografia ? ', ¡añádela!' : '.'}`}
        />
      )}

      <SimpleFAB
        label="Editar biografía"
        icon={<Pencil className="w-5 h-5" />}
        onClick={() => setIsEditingBiografia(true)}
        hidden={!canEditBiografia}
      />

      {isEditingBiografia && (
        <EditBiografiaModal
          initialBiografia={persona.biografia || ''}
          onCancel={() => setIsEditingBiografia(false)}
          onSave={handleSaveBiografia}
          isSubmitting={isPending('save')}
        />
      )}
    </>
  );
}
