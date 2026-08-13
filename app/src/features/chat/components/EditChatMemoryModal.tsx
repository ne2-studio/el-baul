import React, { useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { ModalActions } from '@/design-system/components/overlays/ModalActions';

interface EditChatMemoryModalProps {
  initialContent: string;
  onCancel: () => void;
  onSave: (content: string) => void;
  isSubmitting?: boolean;
}

export function EditChatMemoryModal({ initialContent, onCancel, onSave, isSubmitting = false }: EditChatMemoryModalProps) {
  const [content, setContent] = useState(initialContent);

  const handleSave = () => {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;
    onSave(trimmed);
  };

  return (
    <BottomSheetModal onCancel={onCancel} size="lg">
      <h2 className="text-xl font-serif text-foreground">Editar memoria</h2>

      <Input
        label="Memoria"
        value={content}
        onChange={setContent}
        rows={4}
        multiline
        variant="modal"
        inputClassName="resize-none"
        autoFocus
      />

      <ModalActions>
        <Button variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-sm"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!content.trim() || isSubmitting}
          isLoading={isSubmitting}
          className="text-sm"
        >
          Guardar
        </Button>
      </ModalActions>
    </BottomSheetModal>
  );
}
