import React, { useState } from 'react';
import { Persona } from '@/types';
import { Button } from '@/design-system/components/actions/Button';
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

      <div>
        <label
          className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block"
          style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
        >
          Nombre *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre completo"
          className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground text-base outline-none focus:ring-2 focus:ring-primary/30"
          autoFocus
        />
      </div>

      <div>
        <label
          className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block"
          style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
        >
          Apodo
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Ej. Abuela, Tío Juan…"
          className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground text-base outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

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
