import React, { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { Avatar } from '@/design-system/components/data-display/Avatar';
import { SelectionRow } from '@/design-system/components/data-display/SelectionRow';
import { SwimlaneLabel } from '@/design-system/components/data-display/SwimlaneLabel';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { ModalActions } from '@/design-system/components/overlays/ModalActions';
import { Persona } from '@/types';
import { sortPersonasForTagging } from '@/utils/personaOrder';
import { filterCandidatesForDirection, RelationshipDirection } from '@/utils/personaRelationships';

type Direction = RelationshipDirection;

interface EditRelationshipsModalProps {
  personaId: string;
  personaName: string;
  parents: Persona[];
  children: Persona[];
  /** El Baúl models monogamous families only — at most one spouse, never a list. */
  spouse: Persona | null;
  /** Every other persona in the baúl, for the "añadir relación" picker — the caller already
   * excludes personaId itself. */
  candidates: Persona[];
  onRemove: (relatedPersonaId: string) => void;
  removingId?: string | null;
  /** Resolves to whether the relationship was actually created — false (e.g. a validation
   * error the backend rejected, already toasted by the caller) keeps the "add" view open with
   * the current pick intact instead of bouncing back to the list. */
  onAdd: (parentId: string, childId: string) => Promise<boolean>;
  /** Same contract as onAdd, for the symmetric "cónyuge" edge — see
   * PersonaSpouseRelationshipManager.AddSpouseRelationshipAsync. */
  onAddSpouse: (spouseId: string) => Promise<boolean>;
  isSubmittingAdd?: boolean;
  onCancel: () => void;
}

// Two views in one modal instead of two separate ones stacked on top of each other: "list"
// (the ficha's Padres/Hijos/Cónyuge, each removable) and "add" (direction + persona picker) —
// see the feature spec's "Editar relaciones" / "Añadir relación" mockups. Going back from "add"
// just discards the in-progress pick, it never partially applies anything.
export function EditRelationshipsModal({
  personaId,
  personaName,
  parents,
  children,
  spouse,
  candidates,
  onRemove,
  removingId = null,
  onAdd,
  onAddSpouse,
  isSubmittingAdd = false,
  onCancel,
}: EditRelationshipsModalProps) {
  const [view, setView] = useState<'list' | 'add'>('list');
  // Fixed for the lifetime of a single "add" flow instance — set once by whichever of the 3
  // list-view buttons opened it, never toggled from within the add view itself.
  const [direction, setDirection] = useState<Direction>('parent');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const openAddView = (fixedDirection: Direction) => {
    setDirection(fixedDirection);
    setSearch('');
    setSelectedId(null);
    setView('add');
  };

  const handleAdd = async () => {
    if (!selectedId) return;
    if (direction === 'spouse') {
      const added = await onAddSpouse(selectedId);
      if (added) setView('list');
      return;
    }
    // "Pedro es padre/madre de X" -> Pedro is the parent; "Pedro es hijo/hija de X" -> X is
    // the parent. Either way the backend only ever sees a plain (parentId, childId) pair — see
    // PersonaRelationshipManager.AddRelationshipAsync.
    const added = await onAdd(direction === 'parent' ? personaId : selectedId, direction === 'parent' ? selectedId : personaId);
    if (added) setView('list');
  };

  if (view === 'add') {
    const eligibleCandidates = filterCandidatesForDirection(candidates, direction, parents, children, spouse);
    const filtered = sortPersonasForTagging(eligibleCandidates).filter((p) =>
      `${p.name ?? ''} ${p.nickname}`.toLowerCase().includes(search.trim().toLowerCase())
    );

    const directionCopy: Record<Direction, string> = {
      parent: 'es padre/madre de',
      child: 'es hijo/hija de',
      spouse: 'es cónyuge de',
    };

    return (
      <BottomSheetModal onCancel={onCancel} size="lg">
        <h2 className="text-xl font-serif text-foreground mb-1">Añadir relación</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {personaName} {directionCopy[direction]}...
        </p>

        <Input
          value={search}
          onChange={setSearch}
          placeholder="Buscar persona..."
          variant="modal"
          className="mb-3"
        />

        <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No se ha encontrado ninguna persona</p>
          ) : (
            filtered.map((candidate) => (
              <SelectionRow
                key={candidate.id}
                selected={selectedId === candidate.id}
                control="radio"
                controlPosition="right"
                onClick={() => setSelectedId(candidate.id)}
                leading={<Avatar name={candidate.nickname} src={candidate.avatarUrl} size={8} />}
              >
                <span className="text-sm text-foreground flex-1">{candidate.nickname}</span>
              </SelectionRow>
            ))
          )}
        </div>

        <ModalActions className="pt-0">
          <Button variant="secondary" onClick={() => setView('list')} disabled={isSubmittingAdd} className="text-sm">
            Atrás
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedId || isSubmittingAdd}
            isLoading={isSubmittingAdd}
            className="text-sm"
          >
            Añadir
          </Button>
        </ModalActions>
      </BottomSheetModal>
    );
  }

  return (
    <BottomSheetModal onCancel={onCancel} size="lg">
      <h2 className="text-xl font-serif text-foreground mb-4">Editar relaciones de {personaName}</h2>

      <RelationshipGroup
        title="Padres"
        emptyLabel="Sin padres añadidos todavía"
        personas={parents}
        removingId={removingId}
        onRemove={onRemove}
      >
        {parents.length < 2 && (
          <Button variant="secondary" onClick={() => openAddView('parent')} className="w-full text-sm">
            Añadir padre/madre
          </Button>
        )}
      </RelationshipGroup>

      <RelationshipGroup
        title="Hijos"
        emptyLabel="Sin hijos añadidos todavía"
        personas={children}
        removingId={removingId}
        onRemove={onRemove}
      >
        <Button variant="secondary" onClick={() => openAddView('child')} className="w-full text-sm">
          Añadir hijo/a
        </Button>
      </RelationshipGroup>

      <RelationshipGroup
        title="Cónyuge"
        emptyLabel="Sin cónyuge añadido todavía"
        personas={spouse ? [spouse] : []}
        removingId={removingId}
        onRemove={onRemove}
      >
        {!spouse && (
          <Button variant="secondary" onClick={() => openAddView('spouse')} className="w-full text-sm">
            Añadir cónyuge
          </Button>
        )}
      </RelationshipGroup>

      <ModalActions className="pt-0">
        <Button variant="secondary" onClick={onCancel} className="text-sm">
          Cerrar
        </Button>
      </ModalActions>
    </BottomSheetModal>
  );
}

interface RelationshipGroupProps {
  title: string;
  emptyLabel: string;
  personas: Persona[];
  removingId?: string | null;
  onRemove: (relatedPersonaId: string) => void;
  /** This section's "Añadir..." button — omitted by the caller once the relationship type is
   * at its cap, so it simply doesn't render (not merely disabled). Rendered after the persona
   * list, or in place of the empty-state text when the group is empty. */
  children?: React.ReactNode;
}

function RelationshipGroup({ title, emptyLabel, personas, removingId, onRemove, children }: RelationshipGroupProps) {
  return (
    <div className="mb-6">
      <SwimlaneLabel>{title}</SwimlaneLabel>
      {personas.length === 0 ? (
        children ?? <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {personas.map((persona) => (
            <div key={persona.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
              <Avatar name={persona.nickname} src={persona.avatarUrl} size={8} />
              <span className="text-sm text-foreground flex-1 truncate">{persona.nickname}</span>
              <Button
                variant="plain"
                className="p-1.5 text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/10"
                aria-label={`Eliminar relación con ${persona.nickname}`}
                onClick={() => onRemove(persona.id)}
                disabled={removingId === persona.id}
              >
                {removingId === persona.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
          {children && <div className="mt-2">{children}</div>}
        </div>
      )}
    </div>
  );
}
