import { useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { ModalActions } from '@/design-system/components/overlays/ModalActions';

interface RemovalRequestModalProps {
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  isSubmitting?: boolean;
}

// Modal para que un colaborador solicite la retirada de una foto (la revisa el custodio del baúl).
export function RemovalRequestModal({ onCancel, onConfirm, isSubmitting = false }: RemovalRequestModalProps) {
  const [reason, setReason] = useState('');

  return (
    <BottomSheetModal onCancel={onCancel} desktopCentered>
      <h2 className="font-serif text-xl text-foreground mb-2">
        Solicitar retirada de esta foto
      </h2>

      <p className="text-muted-foreground text-sm mb-4">
        El custodio del baúl revisará tu solicitud.
      </p>

      <Input
        value={reason}
        onChange={setReason}
        placeholder="Cuéntanos por qué no quieres que esta foto aparezca en este baúl"
        rows={4}
        multiline
        inputClassName="min-h-[120px] rounded-lg p-3 focus:ring-primary"
        className="mb-6"
        disabled={isSubmitting}
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
          variant="primary"
          onClick={() => reason.trim() && onConfirm(reason.trim())}
          disabled={!reason.trim() || isSubmitting}
          isLoading={isSubmitting}
        >
          Enviar solicitud
        </Button>
      </ModalActions>
    </BottomSheetModal>
  );
}
