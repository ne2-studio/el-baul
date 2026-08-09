import { ConfirmActionModal } from '@/design-system/patterns/forms/ConfirmActionModal';

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
    <ConfirmActionModal
      title="Eliminar capítulo"
      description={
        <>
          <span className="font-semibold">Atención:</span>{' '}
          {pluralize(photoCount, 'foto', 'fotos')} y {pluralize(recuerdoCount, 'recuerdo', 'recuerdos')} quedarán
          sueltos en el baúl. ¿Estás seguro?
        </>
      }
      confirmLabel="Sí, eliminar capítulo"
      backdropOpacity={60}
      onCancel={onCancel}
      onConfirm={() => onConfirm()}
      isSubmitting={isSubmitting}
    />
  );
}
