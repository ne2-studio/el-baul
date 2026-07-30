import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';

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
      <Input
        inputRef={inputRef}
        value={text}
        onChange={setText}
        rows={4}
        aria-label="Contenido del recuerdo"
        multiline
        variant={tone === 'dark' ? 'inlineDark' : 'support'}
        inputClassName={tone === 'light' ? 'min-h-0 text-sm placeholder:text-muted-foreground/60' : undefined}
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
          variant="primary"
          onClick={handleSubmit}
          disabled={!canSave}
          className="px-3 py-2 rounded-xl text-sm disabled:opacity-40"
        >
          {isSaving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}
