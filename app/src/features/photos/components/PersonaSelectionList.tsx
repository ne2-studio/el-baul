import { SelectionRow } from '@/design-system/components/data-display/SelectionRow';
import { Avatar } from '@/design-system/components/data-display/Avatar';
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
            leading={<Avatar name={persona.nickname} src={persona.avatarUrl} size={8} />}
          >
            <span className="text-sm text-foreground flex-1">{persona.nickname}</span>
          </SelectionRow>
        );
      })}
    </>
  );
}
