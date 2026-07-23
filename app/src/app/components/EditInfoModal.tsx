import React, { useState } from 'react';
import { Button } from './Button';
import { BottomSheetModal } from './BottomSheetModal';

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

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;
    onSave(trimmedName, description.trim());
  };

  return (
    <BottomSheetModal onCancel={onCancel} size="lg">
      <h2 className="text-xl font-serif text-foreground">{title}</h2>
      <div>
        <label
          className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block"
          style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
        >
          Nombre
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder={namePlaceholder}
          className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground text-base outline-none focus:ring-2 focus:ring-primary/30"
          autoFocus
        />
      </div>
      {showDescription && (
        <div>
          <label
            className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block"
            style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
          >
            Descripción
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Añadir descripción…"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground/50"
          />
        </div>
      )}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 py-3 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
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
