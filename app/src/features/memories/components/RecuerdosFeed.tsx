import React, { useState } from 'react';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { Photo, Recuerdo } from '@/types';
import { RecuerdoFeedCard } from '@/features/memories/components/RecuerdoFeedCard';

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
              <Icon icon={icons.bookOpen} size="xl" className="text-primary/60" strokeWidth={1.5} aria-hidden />
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
                showChapterBadge={false}
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
        icon={<Icon icon={icons.bookOpen} aria-hidden />}
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
          <button
            onClick={onCancel}
            aria-label="Cerrar"
            className="p-1.5 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
          >
            <Icon icon={icons.close} size="sm" aria-hidden />
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
