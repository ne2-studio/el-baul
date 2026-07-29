import { Button } from '@/design-system/components/actions/Button';
import { Notice } from '@/design-system/components/feedback/Notice';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';

interface RevokeAccessModalProps {
  userName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function RevokeAccessModal({ userName, onConfirm, onCancel, isSubmitting = false }: RevokeAccessModalProps) {
  return (
    <BottomSheetModal onCancel={onCancel} desktopCentered backdropOpacity={60}>
      <h2 className="font-serif text-xl text-foreground mb-1">
        ¿Revocar el acceso?
      </h2>

      <Notice variant="destructive" size="sm" className="mb-5 mt-3">
        <span className="font-semibold">{userName}</span> dejará de poder acceder al baúl, y no podrá recibir invitaciones en el futuro, pero seguirá formando parte de la historia familiar y aparecerá en fotos, recuerdos y cronologías.
      </Notice>

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
          onClick={onConfirm}
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          Revocar acceso
        </Button>
      </div>
    </BottomSheetModal>
  );
}
