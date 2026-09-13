import { Button } from '@/design-system/components/actions/Button';
import { SelectionRow } from '@/design-system/components/data-display/SelectionRow';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { ModalActions } from '@/design-system/components/overlays/ModalActions';
import { Baul } from '@/types';

interface AddToBaulModalProps {
  baules: Baul[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

// "Añadir a otro baúl" (docs/.backlog issue #62, Slice 2): mismo patrón que MoveModal
// (selección única en una lista, "Añadir" al final), pero eligiendo baúl destino en vez de
// capítulo — deliberadamente simple, sin buscador ni multi-selección. `baules` ya llega filtrado
// por el caller a los baúles donde el usuario puede añadir contenido (ver
// usePhotoViewerActions), así que aquí solo hace falta pintar la lista.
export function AddToBaulModal({ baules, selectedId, onSelect, onCancel, onConfirm, isSubmitting = false }: AddToBaulModalProps) {
  return (
    <BottomSheetModal onCancel={onCancel} backdropOpacity={40}>
      <h2 className="text-lg font-medium text-foreground mb-4">Añadir a otro baúl</h2>
      {baules.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1 py-2 mb-6">No tienes otros baúles a los que añadir esta foto.</p>
      ) : (
        <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-2">
          {baules.map((baul) => (
            <SelectionRow
              key={baul.id}
              selected={selectedId === baul.id}
              onClick={() => onSelect(baul.id)}
              disabled={isSubmitting}
            >
              <span className="text-sm text-foreground">{baul.name}</span>
            </SelectionRow>
          ))}
        </div>
      )}
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
          disabled={!selectedId || isSubmitting}
          isLoading={isSubmitting}
          className="text-sm"
        >
          Añadir
        </Button>
      </ModalActions>
    </BottomSheetModal>
  );
}
