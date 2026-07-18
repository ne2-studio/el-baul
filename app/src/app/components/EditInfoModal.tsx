import React, { useState } from 'react';

interface EditInfoModalProps {
  title: string;
  initialName: string;
  initialDescription: string;
  namePlaceholder: string;
  onCancel: () => void;
  onSave: (name: string, description: string) => void;
}

export function EditInfoModal({
  title,
  initialName,
  initialDescription,
  namePlaceholder,
  onCancel,
  onSave,
}: EditInfoModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onSave(trimmedName, description.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-card w-full max-w-2xl rounded-t-3xl px-6 pt-6 pb-10 space-y-5 animate-slide-up">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-2" />
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
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
