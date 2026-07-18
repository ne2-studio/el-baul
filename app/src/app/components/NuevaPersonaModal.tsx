import React, { useState } from 'react';

interface NuevaPersonaModalProps {
  onCancel: () => void;
  onSave: (nickname: string) => void;
}

export function NuevaPersonaModal({ onCancel, onSave }: NuevaPersonaModalProps) {
  const [nickname, setNickname] = useState('');

  const handleSave = () => {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-card w-full max-w-2xl rounded-t-3xl px-6 pt-6 pb-10 space-y-5 animate-slide-up">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-2" />
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
            className="flex-1 py-3 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!nickname.trim()}
            className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
}
