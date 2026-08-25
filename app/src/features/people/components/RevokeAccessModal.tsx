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
          <span className="font-semibold">{userName}</span> dejará de poder acceder al baúl y su enlace de
          invitación actual dejará de funcionar, pero seguirá formando parte de la historia familiar, aparecerá
          en fotos, recuerdos y cronologías, y podrás volver a invitarle más adelante.
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
