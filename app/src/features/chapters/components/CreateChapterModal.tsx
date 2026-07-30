import { useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { ModalActions } from '@/design-system/components/overlays/ModalActions';

interface CreateChapterModalProps {
  onCancel: () => void;
  onSave: (name: string) => void;
  isSubmitting?: boolean;
}

export function CreateChapterModal({ onCancel, onSave, isSubmitting = false }: CreateChapterModalProps) {
  const [name, setName] = useState('');

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed || isSubmitting) return;
    onSave(trimmed);
  };

  return (
    <BottomSheetModal onCancel={onCancel} size="lg">
      <h2 className="text-xl font-serif text-foreground">Nuevo capítulo</h2>
      <Input
        label="Nombre del capítulo"
        placeholder="Verano 2018"
        value={name}
        onChange={setName}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        variant="modal"
        autoFocus
      />
      <ModalActions>
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-sm"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!name.trim() || isSubmitting}
          isLoading={isSubmitting}
          className="text-sm"
        >
          Crear capítulo
        </Button>
      </ModalActions>
    </BottomSheetModal>
  );
}
