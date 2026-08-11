import { useState } from 'react';
import { PartialDatePicker } from '@/design-system/components/forms/PartialDatePicker';
import { Button } from '@/design-system/components/actions/Button';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { ModalActions } from '@/design-system/components/overlays/ModalActions';
import { PhotoDate } from '@/types';

interface DateModalProps {
  title: string;
  onCancel: () => void;
  onConfirm: (date: PhotoDate) => void;
  isSubmitting?: boolean;
  /** Fecha a preseleccionar, p.ej. la fecha actual de la foto al editarla. Omitida en el
   * cambio en lote, donde varias fotos pueden tener fechas distintas o ninguna. */
  initialValue?: PhotoDate;
}

// Modal compartido para cambiar la fecha de una foto (individual o en lote).
export function DateModal({ title, onCancel, onConfirm, isSubmitting = false, initialValue }: DateModalProps) {
  const [pending, setPending] = useState<PhotoDate | null>(initialValue ?? null);

  return (
    <BottomSheetModal onCancel={onCancel} backdropOpacity={40}>
      <h2 className="text-lg font-medium text-foreground mb-5">{title}</h2>
      <div className="mb-6">
        <PartialDatePicker initialValue={initialValue} onChange={(v) => setPending(v)} />
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
          onClick={() => pending && onConfirm(pending)}
          disabled={!pending?.year || isSubmitting}
          isLoading={isSubmitting}
          className="text-sm"
        >
          Confirmar
        </Button>
      </ModalActions>
    </BottomSheetModal>
  );
}
