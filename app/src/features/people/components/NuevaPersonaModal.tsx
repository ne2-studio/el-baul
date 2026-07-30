import React, { useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';

interface NuevaPersonaModalProps {
  onCancel: () => void;
  onSave: (nickname: string) => void;
  isSubmitting?: boolean;
}

export function NuevaPersonaModal({ onCancel, onSave, isSubmitting = false }: NuevaPersonaModalProps) {
  const [nickname, setNickname] = useState('');

  const handleSave = () => {
    const trimmed = nickname.trim();
    if (!trimmed || isSubmitting) return;
    onSave(trimmed);
  };

  return (
    <BottomSheetModal onCancel={onCancel} size="lg">
      <h2 className="text-xl font-serif text-foreground">Nueva persona</h2>
      <Input
        label="Apodo"
        value={nickname}
        onChange={setNickname}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        placeholder="Ej. Abuela, Tío Juan..."
        variant="modal"
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
          disabled={!nickname.trim() || isSubmitting}
          isLoading={isSubmitting}
          className="flex-1 text-sm"
        >
          Añadir
        </Button>
      </div>
    </BottomSheetModal>
  );
}
