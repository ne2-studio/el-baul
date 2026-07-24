import React, { useState } from 'react';
import { SimpleFAB } from './FAB';
import { BookOpen, X } from 'lucide-react';
import { Photo, Recuerdo } from './PhotosView';

interface RecuerdosFeedProps {
  active: boolean;
  photos: Photo[];
  recuerdos: Recuerdo[];
  onSelectPhoto: (photo: Photo) => void;
  onAddRecuerdo?: (text: string) => void;
  onUserClick?: (personaId: string) => void;
  selectionMode: boolean;
}

// Feed de recuerdos de un capítulo: lista, botón de escribir y su modal. `active`
// controla la visibilidad (contenido + FAB) sin desmontar el componente al cambiar
// de pestaña, igual que hacía PhotosView antes de la extracción.
export function RecuerdosFeed({
  active, photos, recuerdos, onSelectPhoto, onAddRecuerdo, onUserClick, selectionMode,
}: RecuerdosFeedProps) {
  const [showWriteModal, setShowWriteModal] = useState(false);
  const sortedRecuerdos = [...recuerdos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSaveRecuerdo = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddRecuerdo?.(trimmed);
    setShowWriteModal(false);
  };

  return (
    <>
      {active && (
        sortedRecuerdos.length === 0 ? (
          <div className="py-12 text-center max-w-xs mx-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-primary/60" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-serif text-foreground mb-2">Aún no hay recuerdos escritos</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Los recuerdos escritos por la familia harán que este capítulo cobre vida.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedRecuerdos.map((recuerdo) => (
              <RecuerdoFeedCard
                key={recuerdo.id}
                recuerdo={recuerdo}
                onPhotoClick={
                  recuerdo.photoId
                    ? () => {
                        const photo = photos.find((p) => p.id === recuerdo.photoId);
                        if (photo) onSelectPhoto(photo);
                      }
                    : undefined
                }
                onUserClick={onUserClick}
              />
            ))}
          </div>
        )
      )}

      <SimpleFAB
        label="Escribe lo que recuerdas"
        icon={<BookOpen className="w-5 h-5" />}
        onClick={() => setShowWriteModal(true)}
        hidden={!active || selectionMode}
      />

      {showWriteModal && (
        <WriteRecuerdoModal
          onCancel={() => setShowWriteModal(false)}
          onSave={handleSaveRecuerdo}
        />
      )}
    </>
  );
}

// ─── Recuerdo feed card ───────────────────────────────────────────────────────
function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function RecuerdoFeedCard({
  recuerdo, onPhotoClick, onUserClick,
}: { recuerdo: Recuerdo; onPhotoClick?: () => void; onUserClick?: (personaId: string) => void }) {
  const userName = recuerdo.isOwn ? 'Yo' : (recuerdo.userName || 'Usuario desconocido');
  const canOpenPersona = !!(recuerdo.personaId && onUserClick);

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={canOpenPersona ? () => onUserClick!(recuerdo.personaId!) : undefined}
          disabled={!canOpenPersona}
          className={`w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 overflow-hidden ${canOpenPersona ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
        >
          {recuerdo.userAvatar ? (
            <img src={recuerdo.userAvatar} alt={userName} className="w-full h-full object-cover rounded-full" />
          ) : (
            getInitials(userName)
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm font-medium text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground shrink-0">{new Date(recuerdo.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed font-serif">{recuerdo.text}</p>
          {recuerdo.photoThumbnailUrl && (
            <button
              onClick={onPhotoClick}
              className="mt-3 block rounded-xl overflow-hidden hover:opacity-90 transition-opacity"
            >
              <img src={recuerdo.photoThumbnailUrl} alt="" className="w-full max-h-36 object-cover rounded-xl" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Write recuerdo modal ───────────────────────────────────────────────────────
function WriteRecuerdoModal({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState('');

  return (
    <div className="fixed inset-0 bg-foreground/40 z-[60] flex items-end justify-center">
      <div className="absolute inset-0" onClick={onCancel} />
      <div className="bg-background rounded-t-2xl w-full max-w-md p-6 relative z-10 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-foreground">Escribe lo que recuerdas</h2>
          <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-secondary transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="¿Qué recuerdas de este momento? Escríbelo para que la familia lo guarde…"
          className="w-full border border-border rounded-2xl px-4 py-3 text-sm text-foreground bg-card outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground/60 leading-relaxed"
        />
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSave(text)}
            disabled={!text.trim()}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            Guardar recuerdo
          </button>
        </div>
      </div>
    </div>
  );
}
