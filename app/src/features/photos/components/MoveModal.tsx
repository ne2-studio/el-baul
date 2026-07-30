import { Button } from '@/design-system/components/actions/Button';
import { SelectionRow } from '@/design-system/components/data-display/SelectionRow';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { ModalActions } from '@/design-system/components/overlays/ModalActions';
import { Chapter } from '@/types';

interface MoveModalProps {
  title: string;
  chapters: Chapter[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

// Modal compartido para mover fotos a otro capítulo (individual o en lote).
export function MoveModal({ title, chapters, selectedId, onSelect, onCancel, onConfirm, isSubmitting = false }: MoveModalProps) {
  return (
    <BottomSheetModal onCancel={onCancel} backdropOpacity={40}>
      <h2 className="text-lg font-medium text-foreground mb-4">{title}</h2>
      <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
        {chapters.map(a => (
          <SelectionRow
            key={a.id}
            selected={selectedId === a.id}
            onClick={() => onSelect(a.id)}
            disabled={isSubmitting}
          >
            <span className="text-sm text-foreground">{a.name}</span>
          </SelectionRow>
        ))}
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
          disabled={!selectedId || isSubmitting}
          isLoading={isSubmitting}
          className="text-sm"
        >
          Mover aquí
        </Button>
      </ModalActions>
    </BottomSheetModal>
  );
}
