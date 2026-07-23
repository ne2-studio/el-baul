import { Button } from './Button';
import { BottomSheetModal } from './BottomSheetModal';

interface DeleteAlbumModalProps {
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
export function DeleteAlbumModal({ photoCount, recuerdoCount, onCancel, onConfirm, isSubmitting = false }: DeleteAlbumModalProps) {
  return (
    <BottomSheetModal onCancel={onCancel} desktopCentered backdropOpacity={60}>
      <h2 className="font-serif text-xl text-foreground mb-1">
        Eliminar capítulo
      </h2>

      <div className="bg-destructive/8 border border-destructive/20 rounded-xl p-3 mb-5 mt-3">
        <p className="text-xs text-destructive/80 leading-relaxed">
          <span className="font-semibold">Atención:</span>{' '}
          {pluralize(photoCount, 'foto', 'fotos')} y {pluralize(recuerdoCount, 'recuerdo', 'recuerdos')} quedarán
          sueltos en el baúl. ¿Estás seguro?
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
          Sí, eliminar capítulo
        </Button>
      </div>
    </BottomSheetModal>
  );
}
