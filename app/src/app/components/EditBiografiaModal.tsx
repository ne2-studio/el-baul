import React, { useState } from 'react';
import { Button } from './Button';
import { BottomSheetModal } from './BottomSheetModal';

interface EditBiografiaModalProps {
  initialBiografia: string;
  onCancel: () => void;
  onSave: (biografia: string) => void;
  isSubmitting?: boolean;
}

export function EditBiografiaModal({
  initialBiografia,
  onCancel,
  onSave,
  isSubmitting = false,
}: EditBiografiaModalProps) {
  const [biografia, setBiografia] = useState(initialBiografia);

  const handleSave = () => {
    if (isSubmitting) return;
    onSave(biografia.trim());
  };

  return (
    <BottomSheetModal onCancel={onCancel} size="lg">
      <h2 className="text-xl font-serif text-foreground">Editar biografía</h2>

      <div>
        <label
          className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block"
          style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
        >
          Biografía
        </label>
        <textarea
          value={biografia}
          onChange={(e) => setBiografia(e.target.value)}
          placeholder="Cuéntanos su historia: dónde nació, cómo era, anécdotas…"
          rows={6}
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
          isLoading={isSubmitting}
          disabled={isSubmitting}
          className="flex-1 text-sm"
        >
          Guardar cambios
        </Button>
      </div>
    </BottomSheetModal>
  );
}
