import { ConfirmActionModal } from '@/design-system/patterns/forms/ConfirmActionModal';

interface RemovalRequestModalProps {
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  isSubmitting?: boolean;
}

// Modal para que un colaborador solicite la retirada de una foto (la revisa el custodio del baúl).
export function RemovalRequestModal({ onCancel, onConfirm, isSubmitting = false }: RemovalRequestModalProps) {
  return (
    <ConfirmActionModal
      title="Solicitar retirada de esta foto"
      tone="plain"
      description="El custodio del baúl revisará tu solicitud."
      reason={{
        placeholder: 'Cuéntanos por qué no quieres que esta foto aparezca en este baúl',
        rows: 4,
        inputClassName: 'min-h-[120px] rounded-lg p-3 focus:ring-primary',
      }}
      confirmLabel="Enviar solicitud"
      confirmVariant="primary"
      onCancel={onCancel}
      onConfirm={(reason) => onConfirm(reason!)}
      isSubmitting={isSubmitting}
    />
  );
}
