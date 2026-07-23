import React, { useState } from 'react';
import { Button } from './Button';
import { BottomSheetModal } from './BottomSheetModal';

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
