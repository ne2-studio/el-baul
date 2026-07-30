import React, { useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';

interface EditBiografiaModalProps {
  initialBiografia: string;
  onCancel: () => void;
  onSave: (biografia: string) => void;
  isSubmitting?: boolean;
}

export function EditBiografiaModal({
  initialBiografia,
  onCancel,
  onSave,
  isSubmitting = false,
}: EditBiografiaModalProps) {
  const [biografia, setBiografia] = useState(initialBiografia);

  const handleSave = () => {
    if (isSubmitting) return;
    onSave(biografia.trim());
  };

  return (
    <BottomSheetModal onCancel={onCancel} size="lg">
      <h2 className="text-xl font-serif text-foreground">Editar biografía</h2>

      <Input
        label="Biografía"
        value={biografia}
        onChange={setBiografia}
        placeholder="Cuéntanos su historia: dónde nació, cómo era, anécdotas..."
        rows={6}
        multiline
        variant="modal"
        inputClassName="resize-none"
        autoFocus
      />

      <div className="flex gap-3 pt-1">
        <Button variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 text-sm"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          isLoading={isSubmitting}
          disabled={isSubmitting}
          className="flex-1 text-sm"
        >
          Guardar cambios
        </Button>
      </div>
    </BottomSheetModal>
  );
}
