import { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { Avatar } from '@/design-system/components/data-display/Avatar';
import { SelectionRow } from '@/design-system/components/data-display/SelectionRow';
import { Input } from '@/design-system/components/forms/Input';
import { NuevaPersonaModal } from '@/features/people/components/NuevaPersonaModal';
import { Persona } from '@/types';
import { sortPersonasForTagging } from '@/utils/personaOrder';

interface PersonaTaggingPickerProps {
  personas: Persona[];
  selectedIds: string[];
  onToggle: (personaId: string) => void;
  // Crea la persona en el baúl y la devuelve para que este componente la seleccione al vuelo;
  // undefined significa que la creación falló (el caller ya se encarga de avisar con un toast,
  // vía useAsyncAction) y aquí simplemente no se selecciona nada.
  onCreatePersona: (nickname: string) => Promise<Persona | undefined>;
  disabled?: boolean;
  // false cuando este picker vive dentro de una pantalla con scroll propio (p. ej.
  // ContributionSuggestionScreen a pantalla completa) en vez de una hoja modal de alto acotado
  // (TagPersonasModal): sin esto, la lista abriría su propia barra de scroll interna en vez de
  // dejar que la página entera haga scroll por debajo de la foto/cabecera fijas.
  scrollable?: boolean;
}

// Selector de personas para etiquetar, compartido por TagPersonasModal (hoja modal) y
// ContributionSuggestionScreen (pantalla completa) — el PRD de esta última pide explícitamente
// "el mismo componente que existe actualmente para etiquetar personas", no una reimplementación
// con el mismo aspecto.
//
// Alternativa "1d" del canvas de diseño "Etiquetar Personas - Alternativas": combina buscador +
// crear (como mover a otro capítulo) con una fila fija de "crear nueva persona" (como invitar a
// la familia), y hace que marcar a alguien lo saque de la lista y lo convierta en un chip arriba
// — nunca se ve dos veces. Al escribir texto sin coincidencia exacta, la fila fija cambia de
// "Crear nueva persona" a `Crear y etiquetar "<texto>"` y crea directamente con ese nombre; con
// el buscador vacío, abre una hoja anidada (NuevaPersonaModal, sin selector de acceso) que solo
// pide el apodo — igual que el paso de "Invitar a la familia".
export function PersonaTaggingPicker({
  personas,
  selectedIds,
  onToggle,
  onCreatePersona,
  disabled = false,
  scrollable = true,
}: PersonaTaggingPickerProps) {
  const [query, setQuery] = useState('');
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const chips = personas.filter((p) => selectedIds.includes(p.id));
  const unselected = personas.filter((p) => !selectedIds.includes(p.id));
  const trimmedQuery = query.trim();
  const filtered = trimmedQuery
    ? unselected.filter((p) => p.nickname.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : unselected;

  const handleSelect = (personaId: string) => {
    onToggle(personaId);
    setQuery('');
  };

  const createAndSelect = async (nickname: string) => {
    setIsCreating(true);
    const created = await onCreatePersona(nickname);
    setIsCreating(false);
    if (created) onToggle(created.id);
    return created;
  };

  const handleCreateAction = async () => {
    if (trimmedQuery) {
      const created = await createAndSelect(trimmedQuery);
      if (created) setQuery('');
    } else {
      setShowCreateSheet(true);
    }
  };

  const handleCreateFromSheet = async (nickname: string) => {
    const created = await createAndSelect(nickname);
    if (created) setShowCreateSheet(false);
  };

  const isBusy = disabled || isCreating;

  return (
    <div className="flex flex-col gap-3">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((persona) => (
            <div
              key={persona.id}
              className="flex items-center gap-1.5 rounded-full bg-secondary py-1 pl-1 pr-2 text-xs font-medium text-foreground"
            >
              <Avatar name={persona.nickname} src={persona.avatarUrl} size={6} />
              {persona.nickname}
              <button
                type="button"
                onClick={() => onToggle(persona.id)}
                disabled={disabled}
                aria-label={`Quitar a ${persona.nickname}`}
                className="text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Input
        variant="modal"
        placeholder="Buscar o crear persona..."
        value={query}
        onChange={setQuery}
        disabled={isBusy}
        aria-label="Buscar persona"
      />

      <div className={`space-y-2${scrollable ? ' max-h-64 overflow-y-auto pr-2' : ''}`}>
        {sortPersonasForTagging(filtered).map((persona) => (
          <SelectionRow
            key={persona.id}
            selected={false}
            control="none"
            onClick={() => handleSelect(persona.id)}
            disabled={isBusy}
            leading={<Avatar name={persona.nickname} src={persona.avatarUrl} size={8} />}
          >
            <span className="text-sm text-foreground">{persona.nickname}</span>
          </SelectionRow>
        ))}
        <SelectionRow
          selected={false}
          control="none"
          onClick={handleCreateAction}
          disabled={isBusy}
          leading={
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground">
              <UserPlus className="h-4 w-4" />
            </span>
          }
        >
          <span className="text-sm font-medium text-foreground">
            {trimmedQuery ? `Crear y etiquetar "${trimmedQuery}"` : 'Crear nueva persona'}
          </span>
        </SelectionRow>
      </div>

      {showCreateSheet && (
        <NuevaPersonaModal
          stacked
          showAccessSelector={false}
          onCancel={() => setShowCreateSheet(false)}
          onSave={handleCreateFromSheet}
          isSubmitting={isCreating}
        />
      )}
    </div>
  );
}
