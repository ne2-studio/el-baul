import { useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';

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
      <div className="flex gap-3 pt-1">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 text-sm"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!name.trim() || isSubmitting}
          isLoading={isSubmitting}
          className="flex-1 text-sm"
        >
          Crear capítulo
        </Button>
      </div>
    </BottomSheetModal>
  );
}
