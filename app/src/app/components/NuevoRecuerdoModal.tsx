import React, { useState } from 'react';
import { Button } from './Button';
import { BottomSheetModal } from './BottomSheetModal';

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
      <div>
        <label
          className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block"
          style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
        >
          Recuerdo
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un recuerdo del baúl…"
          rows={4}
          className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground text-base outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          autoFocus
        />
      </div>
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
