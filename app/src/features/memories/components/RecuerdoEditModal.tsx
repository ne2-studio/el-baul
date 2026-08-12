import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { RecuerdoEditForm } from '@/features/memories/components/RecuerdoEditForm';

interface RecuerdoEditModalProps {
  initialText: string;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (text: string) => void;
}

// Edición en drawer aparte, no inline en la tarjeta: dentro del visor de fotos, en móvil, el
// formulario inline competía por el poco espacio que deja el teclado con la caja de "nuevo
// recuerdo" y con el layout mitad-foto/mitad-recuerdos del propio visor, y todo se
// descuajaringaba al abrir el teclado. BottomSheetModal ya resuelve el viewport con teclado
// abierto (useVisualViewportInset) — este modal reutiliza ese patrón en vez de reimplementarlo.
export function RecuerdoEditModal({ initialText, isSaving = false, onCancel, onSave }: RecuerdoEditModalProps) {
  return (
    <BottomSheetModal onCancel={onCancel} desktopCentered backdropOpacity={60}>
      <h2 className="font-serif text-xl text-foreground mb-4">Editar recuerdo</h2>
      <RecuerdoEditForm
        initialText={initialText}
        isSaving={isSaving}
        onCancel={onCancel}
        onSave={onSave}
      />
    </BottomSheetModal>
  );
}
