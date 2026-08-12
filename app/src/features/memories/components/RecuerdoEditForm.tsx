import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';

interface RecuerdoEditFormProps {
  initialText: string;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (text: string) => void;
}

export function RecuerdoEditForm({ initialText, isSaving = false, onCancel, onSave }: RecuerdoEditFormProps) {
  const [text, setText] = useState(initialText);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();
  const canSave = trimmed.length > 0 && trimmed !== initialText.trim() && !isSaving;

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Auto-resize al contenido, igual que RecuerdoInput — con un rows fijo, un texto corto se
  // veía dentro de una caja de 4 líneas con el resto en blanco.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  const handleSubmit = () => {
    if (canSave) onSave(trimmed);
  };

  return (
    <div className="space-y-3">
      <Input
        inputRef={inputRef}
        value={text}
        onChange={setText}
        rows={1}
        aria-label="Contenido del recuerdo"
        multiline
        variant="support"
        inputClassName="min-h-0 text-sm placeholder:text-muted-foreground/60"
        style={{ minHeight: '48px', maxHeight: '200px' }}
      />
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSaving}
          className="px-3 py-2 rounded-xl text-sm"
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
