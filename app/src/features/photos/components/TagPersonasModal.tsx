import { Button } from '@/design-system/components/actions/Button';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { ModalActions } from '@/design-system/components/overlays/ModalActions';
import { PersonaTaggingPicker } from '@/features/photos/components/PersonaTaggingPicker';
import { Persona } from '@/types';

interface TagPersonasModalProps {
  title?: string;
  personas: Persona[];
  selectedIds: string[];
  onToggle: (personaId: string) => void;
  onCreatePersona: (nickname: string) => Promise<Persona | undefined>;
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
  onCreatePersona,
  onCancel,
  onConfirm,
  isSubmitting = false,
}: TagPersonasModalProps) {
  return (
    <BottomSheetModal onCancel={onCancel} backdropOpacity={40}>
      <h2 className="text-lg font-medium text-foreground mb-4">{title}</h2>
      <div className="mb-6">
        <PersonaTaggingPicker
          personas={personas}
          selectedIds={selectedIds}
          onToggle={onToggle}
          onCreatePersona={onCreatePersona}
          disabled={isSubmitting}
        />
      </div>
      <ModalActions className="pt-0">
        <Button variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-sm"
        >
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isSubmitting}
          isLoading={isSubmitting}
          className="text-sm"
        >
          Guardar
        </Button>
      </ModalActions>
    </BottomSheetModal>
  );
}
