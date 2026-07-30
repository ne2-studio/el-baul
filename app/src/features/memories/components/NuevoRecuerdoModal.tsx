import React, { useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';

interface NuevoRecuerdoModalProps {
  onCancel: () => void;
  onSave: (text: string) => void;
  isSubmitting?: boolean;
}

export function NuevoRecuerdoModal({ onCancel, onSave, isSubmitting = false }: NuevoRecuerdoModalProps) {
  const [text, setText] = useState('');

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;
    onSave(trimmed);
  };

  return (
    <BottomSheetModal onCancel={onCancel} size="lg">
      <h2 className="text-xl font-serif text-foreground">Nuevo recuerdo</h2>
      <Input
        label="Recuerdo"
        value={text}
        onChange={setText}
        placeholder="Escribe un recuerdo del baúl..."
        rows={4}
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
          disabled={!text.trim() || isSubmitting}
          isLoading={isSubmitting}
          className="flex-1 text-sm"
        >
          Añadir
        </Button>
      </div>
    </BottomSheetModal>
  );
}
