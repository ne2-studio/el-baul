import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Check } from 'lucide-react';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  /** Tailwind classes applied to the text and the input */
  className?: string;
  /** Extra style (e.g. fontFamily) passed to both the text and the input */
  style?: React.CSSProperties;
  multiline?: boolean;
  /** If true, pencil icon is always shown; otherwise only on hover */
  alwaysShowPencil?: boolean;
  disabled?: boolean;
}

export function InlineEdit({
  value,
  onSave,
  placeholder = 'Añadir texto…',
  className = '',
  style,
  multiline = false,
  alwaysShowPencil = true,
  disabled = false,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  // Sync draft when external value changes
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const startEditing = () => {
    if (disabled) return;
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed !== value) onSave(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { setEditing(false); setDraft(value); }
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const sharedInputClass =
    `bg-transparent border-0 border-b-2 border-primary/60 outline-none w-full min-w-0 resize-none px-0 ${className}`;

  return (
    <div className="group flex items-start gap-1.5 min-w-0">
      {editing ? (
        <>
          {multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className={`${sharedInputClass} leading-snug`}
              style={style}
              placeholder={placeholder}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className={sharedInputClass}
              style={style}
              placeholder={placeholder}
            />
          )}
          <button
            onMouseDown={e => { e.preventDefault(); commit(); }}
            className="shrink-0 mt-1 p-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
            aria-label="Guardar"
          >
            <Check className="w-3.5 h-3.5 text-primary" />
          </button>
        </>
      ) : (
        <>
          <span
            className={`min-w-0 break-words ${className} ${!value ? 'text-muted-foreground/40 italic' : ''}`}
            style={style}
          >
            {value || placeholder}
          </span>
          {!disabled && (
            <button
              onClick={startEditing}
              className={`shrink-0 mt-1 p-1 rounded-full hover:bg-secondary transition-colors ${alwaysShowPencil ? 'opacity-40 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'}`}
              aria-label="Editar"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
