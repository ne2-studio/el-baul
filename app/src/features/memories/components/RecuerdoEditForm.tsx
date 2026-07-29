import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';

interface RecuerdoEditFormProps {
  initialText: string;
  tone?: 'light' | 'dark';
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (text: string) => void;
}

export function RecuerdoEditForm({ initialText, tone = 'light', isSaving = false, onCancel, onSave }: RecuerdoEditFormProps) {
  const [text, setText] = useState(initialText);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();
  const canSave = trimmed.length > 0 && trimmed !== initialText.trim() && !isSaving;

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = () => {
    if (canSave) onSave(trimmed);
  };

  return (
    <div className="space-y-3">
      <textarea
        ref={inputRef}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        aria-label="Contenido del recuerdo"
        className={`w-full rounded-2xl px-4 py-3 text-sm leading-relaxed resize-none outline-none border focus:ring-2 focus:ring-ring ${
          tone === 'dark'
            ? 'bg-background/10 border-background/15 text-background placeholder:text-background/40'
            : 'bg-card border-border text-foreground placeholder:text-muted-foreground/60'
        }`}
      />
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant={tone === 'dark' ? 'plain' : 'secondary'}
          onClick={onCancel}
          disabled={isSaving}
          className={tone === 'dark' ? 'px-3 py-2 rounded-xl text-sm text-background/70 hover:bg-background/10' : 'px-3 py-2 rounded-xl text-sm'}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="plain"
          onClick={handleSubmit}
          disabled={!canSave}
          className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          {isSaving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}
