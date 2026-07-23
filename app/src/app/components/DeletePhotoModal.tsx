import { useState } from 'react';
import { Button } from './Button';
import { BottomSheetModal } from './BottomSheetModal';

interface DeletePhotoModalProps {
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  isSubmitting?: boolean;
}

// Modal de confirmación para retirar una foto del baúl (irreversible).
export function DeletePhotoModal({ onCancel, onConfirm, isSubmitting = false }: DeletePhotoModalProps) {
  const [reason, setReason] = useState('');

  return (
    <BottomSheetModal onCancel={onCancel} desktopCentered backdropOpacity={60}>
      <h2 className="font-serif text-xl text-foreground mb-1">
        Retirar esta foto
      </h2>

      <div className="bg-destructive/8 border border-destructive/20 rounded-xl p-3 mb-4 mt-3">
        <p className="text-xs text-destructive/80 leading-relaxed">
          <span className="font-semibold">Atención:</span> Esta foto dejará de estar disponible para todos los miembros del baúl. Todos los recuerdos asociados a ella se perderán de forma permanente.
        </p>
      </div>

      <label className="block text-sm font-medium text-foreground mb-2">
        Motivo de la retirada
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="¿Por qué se retira esta foto?"
        rows={3}
        disabled={isSubmitting}
        className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-destructive/40 placeholder:text-muted-foreground mb-5 disabled:opacity-60"
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
          variant="danger"
          fullWidth
          onClick={() => reason.trim() && onConfirm(reason.trim())}
          disabled={!reason.trim() || isSubmitting}
          isLoading={isSubmitting}
        >
          Sí, retirar foto
        </Button>
      </div>
    </BottomSheetModal>
  );
}
