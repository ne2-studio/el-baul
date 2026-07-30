import { Button } from '@/design-system/components/actions/Button';
import { SelectionRow } from '@/design-system/components/data-display/SelectionRow';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { Persona } from '@/types';

interface TagPersonasModalProps {
  title?: string;
  personas: Persona[];
  selectedIds: string[];
  onToggle: (personaId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

// Variante multi-selección de MoveModal: en vez de un único capítulo, se pueden marcar
// varias personas del baúl para etiquetarlas. Se usa tanto en el visor de una foto
// (reemplaza el conjunto completo de etiquetas) como en la selección múltiple de la
// cuadrícula (añade a las etiquetas ya existentes de cada foto) — `title` distingue el caso.
export function TagPersonasModal({
  title = 'Etiquetar personas',
  personas,
  selectedIds,
  onToggle,
  onCancel,
  onConfirm,
  isSubmitting = false,
}: TagPersonasModalProps) {
  return (
    <BottomSheetModal onCancel={onCancel} backdropOpacity={40}>
      <h2 className="text-lg font-medium text-foreground mb-4">{title}</h2>
      <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
        {personas.map((persona) => {
          const isSelected = selectedIds.includes(persona.id);
          return (
            <SelectionRow
              key={persona.id}
              selected={isSelected}
              control="checkbox"
              controlPosition="right"
              onClick={() => onToggle(persona.id)}
              disabled={isSubmitting}
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
      </div>
      <div className="flex gap-3">
        <Button variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 text-sm"
        >
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isSubmitting}
          isLoading={isSubmitting}
          className="flex-1 text-sm"
        >
          Guardar
        </Button>
      </div>
    </BottomSheetModal>
  );
}
