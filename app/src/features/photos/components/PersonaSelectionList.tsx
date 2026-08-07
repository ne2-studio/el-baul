import { SelectionRow } from '@/design-system/components/data-display/SelectionRow';
import { Persona } from '@/types';

interface PersonaSelectionListProps {
  personas: Persona[];
  selectedIds: string[];
  onToggle: (personaId: string) => void;
  disabled?: boolean;
}

// Lista de personas con checkbox de selección, extraída de TagPersonasModal para que
// ContributionSuggestionScreen la reutilice tal cual a pantalla completa — el PRD pide
// explícitamente "el mismo componente que existe actualmente para etiquetar personas", no una
// reimplementación con el mismo aspecto. No lleva contenedor/scroll propio: cada caller decide
// cómo envolverla (hoja modal con max-height, o el flujo normal de una pantalla completa).
export function PersonaSelectionList({ personas, selectedIds, onToggle, disabled = false }: PersonaSelectionListProps) {
  return (
    <>
      {personas.map((persona) => {
        const isSelected = selectedIds.includes(persona.id);
        return (
          <SelectionRow
            key={persona.id}
            selected={isSelected}
            control="checkbox"
            controlPosition="right"
            onClick={() => onToggle(persona.id)}
            disabled={disabled}
            leading={persona.avatarUrl ? (
              <img src={persona.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs text-muted-foreground">
                {persona.nickname.charAt(0).toUpperCase()}
              </div>
            )}
          >
            <span className="text-sm text-foreground flex-1">{persona.nickname}</span>
          </SelectionRow>
        );
      })}
    </>
  );
}
