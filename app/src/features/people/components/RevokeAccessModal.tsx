import { ConfirmActionModal } from '@/design-system/patterns/forms/ConfirmActionModal';

interface RevokeAccessModalProps {
  userName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function RevokeAccessModal({ userName, onConfirm, onCancel, isSubmitting = false }: RevokeAccessModalProps) {
  return (
    <ConfirmActionModal
      title="¿Revocar el acceso?"
      description={
        <>
          <span className="font-semibold">{userName}</span> dejará de poder acceder al baúl, y no podrá recibir
          invitaciones en el futuro, pero seguirá formando parte de la historia familiar y aparecerá en fotos,
          recuerdos y cronologías.
        </>
      }
      confirmLabel="Revocar acceso"
      backdropOpacity={60}
      onCancel={onCancel}
      onConfirm={() => onConfirm()}
      isSubmitting={isSubmitting}
    />
  );
}
