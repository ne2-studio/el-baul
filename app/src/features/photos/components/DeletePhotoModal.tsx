import { ConfirmActionModal } from '@/design-system/patterns/forms/ConfirmActionModal';

interface DeletePhotoModalProps {
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  isSubmitting?: boolean;
}

// Modal de confirmación para retirar una foto del baúl (irreversible).
export function DeletePhotoModal({ onCancel, onConfirm, isSubmitting = false }: DeletePhotoModalProps) {
  return (
    <ConfirmActionModal
      title="Retirar esta foto"
      description={
        <>
          <span className="font-semibold">Atención:</span> Esta foto dejará de estar disponible para todos los
          miembros del baúl. Todos los recuerdos asociados a ella se perderán de forma permanente.
        </>
      }
      reason={{
        label: 'Motivo de la retirada',
        placeholder: '¿Por qué se retira esta foto?',
        variant: 'destructive',
      }}
      confirmLabel="Sí, retirar foto"
      backdropOpacity={60}
      onCancel={onCancel}
      onConfirm={(reason) => onConfirm(reason!)}
      isSubmitting={isSubmitting}
    />
  );
}
