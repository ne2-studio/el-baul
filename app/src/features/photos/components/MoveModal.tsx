import { useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
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
  const [query, setQuery] = useState('');
  const filteredChapters = chapters.filter(a => a.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <BottomSheetModal onCancel={onCancel} backdropOpacity={40}>
      <h2 className="text-lg font-medium text-foreground mb-4">{title}</h2>
      <Input
        variant="modal"
        placeholder="Buscar capítulo..."
        value={query}
        onChange={setQuery}
        disabled={isSubmitting}
        aria-label="Buscar capítulo"
        className="mb-3"
      />
      <div className="space-y-2 mb-6 h-64 overflow-y-auto pr-2">
        {filteredChapters.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1 py-2">No se encontraron capítulos.</p>
        ) : (
          filteredChapters.map(a => (
            <SelectionRow
              key={a.id}
              selected={selectedId === a.id}
              onClick={() => onSelect(a.id)}
              disabled={isSubmitting}
            >
              <span className="text-sm text-foreground">{a.name}</span>
            </SelectionRow>
          ))
        )}
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
