import React, { useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { ModalActions } from '@/design-system/components/overlays/ModalActions';

interface CreateBaulModalProps {
  onCancel: () => void;
  onSave: (name: string, description: string) => void;
  isOnboarding?: boolean;
  isSubmitting?: boolean;
}

export function CreateBaulModal({ onCancel, onSave, isOnboarding = false, isSubmitting = false }: CreateBaulModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;
    onSave(trimmedName, description.trim());
  };

  return (
    <BottomSheetModal onCancel={onCancel} size="lg">
      <h2 className="text-xl font-serif text-foreground">
        {isOnboarding ? 'Crea tu primer baúl' : 'Nuevo baúl'}
      </h2>
      <Input
        label="Nombre del baúl"
        placeholder={isOnboarding ? 'Familia, Viajes, Recuerdos importantes...' : 'Familia Jimena'}
        value={name}
        onChange={setName}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        variant="modal"
        autoFocus
      />
      <Input
        label="Descripción (opcional)"
        placeholder="Nuestros momentos en familia..."
        value={description}
        onChange={setDescription}
        multiline
        rows={3}
        variant="modal"
        inputClassName="resize-none"
      />
      <p className="text-sm text-muted-foreground">
        {isOnboarding
          ? 'Podrás crear más baúles más adelante'
          : 'Puedes tener varios baúles para distintas etapas o personas'}
      </p>
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
          Crear baúl
        </Button>
      </ModalActions>
    </BottomSheetModal>
  );
}
