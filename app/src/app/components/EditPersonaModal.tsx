import React, { useRef, useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { SharedUser } from '@/types';

interface EditPersonaModalProps {
  persona: SharedUser;
  onCancel: () => void;
  onSave: (name: string, nickname: string) => void;
  onUploadAvatar: (file: File) => void;
}

export function EditPersonaModal({ persona, onCancel, onSave, onUploadAvatar }: EditPersonaModalProps) {
  const [name, setName] = useState(persona.name || '');
  const [nickname, setNickname] = useState(persona.nickname);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedNickname = nickname.trim();
    if (!trimmedName || !trimmedNickname) return;
    onSave(trimmedName, trimmedNickname);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadAvatar(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-card w-full max-w-2xl rounded-t-3xl px-6 pt-6 pb-10 space-y-5 animate-slide-up">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-2" />
        <h2 className="text-xl font-serif text-foreground">Editar persona</h2>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-border"
          >
            {persona.avatarUrl ? (
              <img src={persona.avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-primary" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-medium">Cambiar foto</span>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div>
          <label
            className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block"
            style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
          >
            Nombre *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre completo"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-foreground text-base outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
        </div>

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
            disabled={!name.trim() || !nickname.trim()}
            className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
