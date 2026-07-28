import { Button } from '@/design-system/components/actions/Button';
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
        Quitar acceso
      </h2>

      <div className="bg-destructive/8 border border-destructive/20 rounded-xl p-3 mb-5 mt-3">
        <p className="text-xs text-destructive/80 leading-relaxed">
          <span className="font-semibold">Atención:</span>{' '}
          <span className="font-semibold">{userName}</span> dejará de ver el contenido de este baúl.
        </p>
      </div>

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
          Quitar acceso
        </Button>
      </div>
    </BottomSheetModal>
  );
}
