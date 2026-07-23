import { useState } from 'react';
import { PartialDatePicker } from './PartialDatePicker';
import { Button } from './Button';
import { BottomSheetModal } from './BottomSheetModal';
import { PhotoDate } from '@/types';

interface DateModalProps {
  title: string;
  onCancel: () => void;
  onConfirm: (date: PhotoDate) => void;
  isSubmitting?: boolean;
}

// Modal compartido para cambiar la fecha de una foto (individual o en lote).
export function DateModal({ title, onCancel, onConfirm, isSubmitting = false }: DateModalProps) {
  const [pending, setPending] = useState<PhotoDate | null>(null);

  return (
    <BottomSheetModal onCancel={onCancel} backdropOpacity={40}>
      <h2 className="text-lg font-medium text-foreground mb-5">{title}</h2>
      <div className="mb-6">
        <PartialDatePicker onChange={(v) => setPending(v)} />
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
          onClick={() => pending && onConfirm(pending)}
          disabled={!pending?.year || isSubmitting}
          isLoading={isSubmitting}
          className="flex-1 text-sm"
        >
          Confirmar
        </Button>
      </div>
    </BottomSheetModal>
  );
}
