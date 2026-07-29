import { Button } from '@/design-system/components/actions/Button';
import { Notice } from '@/design-system/components/feedback/Notice';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';

interface DeleteChapterModalProps {
  photoCount: number;
  recuerdoCount: number;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

// Modal de confirmación para eliminar un capítulo (irreversible). Las fotos y recuerdos
// del capítulo no se pierden — quedan sueltos en el baúl.
export function DeleteChapterModal({ photoCount, recuerdoCount, onCancel, onConfirm, isSubmitting = false }: DeleteChapterModalProps) {
  return (
    <BottomSheetModal onCancel={onCancel} desktopCentered backdropOpacity={60}>
      <h2 className="font-serif text-xl text-foreground mb-1">
        Eliminar capítulo
      </h2>

      <Notice variant="destructive" size="sm" className="mb-5 mt-3">
        <span className="font-semibold">Atención:</span>{' '}
        {pluralize(photoCount, 'foto', 'fotos')} y {pluralize(recuerdoCount, 'recuerdo', 'recuerdos')} quedarán
        sueltos en el baúl. ¿Estás seguro?
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
          Sí, eliminar capítulo
        </Button>
      </div>
    </BottomSheetModal>
  );
}
