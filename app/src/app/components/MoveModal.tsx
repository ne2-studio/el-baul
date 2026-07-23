import { Check } from 'lucide-react';
import { Button } from './Button';
import { BottomSheetModal } from './BottomSheetModal';
import { Album } from './AlbumsView';

interface MoveModalProps {
  title: string;
  albums: Album[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

// Modal compartido para mover fotos a otro capítulo (individual o en lote).
export function MoveModal({ title, albums, selectedId, onSelect, onCancel, onConfirm, isSubmitting = false }: MoveModalProps) {
  return (
    <BottomSheetModal onCancel={onCancel} backdropOpacity={40}>
      <h2 className="text-lg font-medium text-foreground mb-4">{title}</h2>
      <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
        {albums.map(a => (
          <button
            key={a.id}
            onClick={() => onSelect(a.id)}
            disabled={isSubmitting}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left disabled:opacity-60 ${
              selectedId === a.id ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-secondary/30'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              selectedId === a.id ? 'bg-primary border-primary' : 'border-border'
            }`}>
              {selectedId === a.id && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm text-foreground">{a.name}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 py-3 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <Button
          onClick={onConfirm}
          disabled={!selectedId || isSubmitting}
          isLoading={isSubmitting}
          className="flex-1 text-sm"
        >
          Mover aquí
        </Button>
      </div>
    </BottomSheetModal>
  );
}
