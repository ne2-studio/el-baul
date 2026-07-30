import React, { useState } from 'react';
import { Persona } from '@/types';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';

interface EditPersonaInfoModalProps {
  persona: Persona;
  onCancel: () => void;
  onSave: (name: string, nickname: string) => void;
  isSubmitting?: boolean;
}

export function EditPersonaInfoModal({
  persona,
  onCancel,
  onSave,
  isSubmitting = false,
}: EditPersonaInfoModalProps) {
  const [name, setName] = useState(persona.name || '');
  const [nickname, setNickname] = useState(persona.nickname);

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedNickname = nickname.trim();
    if (!trimmedName || !trimmedNickname || isSubmitting) return;
    onSave(trimmedName, trimmedNickname);
  };

  return (
    <BottomSheetModal onCancel={onCancel} size="lg">
      <h2 className="text-xl font-serif text-foreground">Editar información</h2>

      <Input
        label="Nombre *"
        value={name}
        onChange={setName}
        placeholder="Nombre completo"
        variant="modal"
        autoFocus
      />

      <Input
        label="Apodo"
        value={nickname}
        onChange={setNickname}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        placeholder="Ej. Abuela, Tío Juan..."
        variant="modal"
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
          disabled={!name.trim() || !nickname.trim() || isSubmitting}
          isLoading={isSubmitting}
          className="flex-1 text-sm"
        >
          Guardar cambios
        </Button>
      </div>
    </BottomSheetModal>
  );
}
