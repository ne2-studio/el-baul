import { useState } from 'react';
import { PartialDatePicker } from './PartialDatePicker';
import { Button } from './Button';
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
    <div className="fixed inset-0 bg-foreground/40 z-[60] flex items-end justify-center">
      <div className="absolute inset-0" onClick={onCancel} />
      <div className="bg-background rounded-t-2xl w-full max-w-md p-6 relative z-10 animate-slide-up">
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
      </div>
    </div>
  );
}
