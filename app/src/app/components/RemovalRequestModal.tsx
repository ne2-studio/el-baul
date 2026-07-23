import { useState } from 'react';
import { Button } from './Button';
import { BottomSheetModal } from './BottomSheetModal';

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

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Cuéntanos por qué no quieres que esta foto aparezca en este baúl"
        className="w-full min-h-[120px] p-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground mb-6"
        disabled={isSubmitting}
        autoFocus
      />

      <div className="flex flex-col-reverse md:flex-row gap-3">
        <Button
          variant="secondary"
          fullWidth
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          fullWidth
          onClick={() => reason.trim() && onConfirm(reason.trim())}
          disabled={!reason.trim() || isSubmitting}
          isLoading={isSubmitting}
        >
          Enviar solicitud
        </Button>
      </div>
    </BottomSheetModal>
  );
}
