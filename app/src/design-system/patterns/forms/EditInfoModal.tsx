import React, { useId, useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';

interface EditInfoModalProps {
  title: string;
  initialName: string;
  /** Omit to hide the description field entirely (e.g. capítulos, which don't have one). */
  initialDescription?: string;
  namePlaceholder: string;
  onCancel: () => void;
  onSave: (name: string, description: string) => void;
  isSubmitting?: boolean;
}

export function EditInfoModal({
  title,
  initialName,
  initialDescription,
  namePlaceholder,
  onCancel,
  onSave,
  isSubmitting = false,
}: EditInfoModalProps) {
  const showDescription = initialDescription !== undefined;
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? '');
  const nameInputId = useId();
  const descriptionInputId = useId();

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;
    onSave(trimmedName, description.trim());
  };

  return (
    <BottomSheetModal onCancel={onCancel} size="lg">
      <h2 className="text-xl font-serif text-foreground">{title}</h2>
      <Input
        id={nameInputId}
        label="Nombre"
        value={name}
        onChange={setName}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        placeholder={namePlaceholder}
        variant="modal"
        autoFocus
      />
      {showDescription && (
        <Input
          id={descriptionInputId}
          label="Descripción"
          value={description}
          onChange={setDescription}
          rows={3}
          multiline
          placeholder="Añadir descripción…"
          variant="modal"
          inputClassName="text-sm resize-none placeholder:text-muted-foreground/50"
        />
      )}
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
          disabled={!name.trim() || isSubmitting}
          isLoading={isSubmitting}
          className="flex-1 text-sm"
        >
          Guardar
        </Button>
      </div>
    </BottomSheetModal>
  );
}
