import { useId, useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { Notice } from '@/design-system/components/feedback/Notice';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { ModalActions } from '@/design-system/components/overlays/ModalActions';

interface DeletePhotoModalProps {
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  isSubmitting?: boolean;
}

// Modal de confirmación para retirar una foto del baúl (irreversible).
export function DeletePhotoModal({ onCancel, onConfirm, isSubmitting = false }: DeletePhotoModalProps) {
  const [reason, setReason] = useState('');
  const reasonInputId = useId();

  return (
    <BottomSheetModal onCancel={onCancel} desktopCentered backdropOpacity={60}>
      <h2 className="font-serif text-xl text-foreground mb-1">
        Retirar esta foto
      </h2>

      <Notice variant="destructive" size="sm" className="mb-4 mt-3">
        <span className="font-semibold">Atención:</span> Esta foto dejará de estar disponible para todos los miembros del baúl. Todos los recuerdos asociados a ella se perderán de forma permanente.
      </Notice>

      <Input
        id={reasonInputId}
        label="Motivo de la retirada"
        value={reason}
        onChange={setReason}
        placeholder="¿Por qué se retira esta foto?"
        rows={3}
        multiline
        disabled={isSubmitting}
        variant="destructive"
        className="mb-5"
        labelClassName="block text-sm font-medium text-foreground"
        autoFocus
      />

      <ModalActions className="pt-0">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={() => reason.trim() && onConfirm(reason.trim())}
          disabled={!reason.trim() || isSubmitting}
          isLoading={isSubmitting}
        >
          Sí, retirar foto
        </Button>
      </ModalActions>
    </BottomSheetModal>
  );
}
