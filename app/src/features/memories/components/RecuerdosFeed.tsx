import React, { useState } from 'react';
import { SimpleFAB } from '@/design-system/components/actions/FAB';
import { Icon } from '@/design-system/foundations/icons/Icon';
import { icons } from '@/design-system/foundations/icons/icons';
import { Photo, Recuerdo } from '@/types';
import { RecuerdoFeedCard } from '@/features/memories/components/RecuerdoFeedCard';
import { Button } from '@/design-system/components/actions/Button';
import { IconButton } from '@/design-system/components/actions/IconButton';
import { Input } from '@/design-system/components/forms/Input';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';

interface RecuerdosFeedProps {
  active: boolean;
  photos: Photo[];
  recuerdos: Recuerdo[];
  onSelectPhoto: (photo: Photo) => void;
  onAddRecuerdo?: (text: string) => void;
  onUserClick?: (personaId: string) => void;
  onShareRecuerdo?: (recuerdo: Recuerdo) => void;
  onEditRecuerdo?: (recuerdo: Recuerdo, text: string) => Promise<boolean> | boolean | void;
  selectionMode: boolean;
}

// Feed de recuerdos de un capítulo: lista, botón de escribir y su modal. `active`
// controla la visibilidad (contenido + FAB) sin desmontar el componente al cambiar
// de pestaña, igual que hacía PhotosView antes de la extracción.
export function RecuerdosFeed({
  active, photos, recuerdos, onSelectPhoto, onAddRecuerdo, onUserClick, onShareRecuerdo, onEditRecuerdo, selectionMode,
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
                onShareRecuerdo={onShareRecuerdo}
                onEditRecuerdo={onEditRecuerdo}
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
    <BottomSheetModal onCancel={onCancel} size="lg">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-foreground">Escribe lo que recuerdas</h2>
        <IconButton onClick={onCancel} aria-label="Cerrar" size="sm">
          <Icon icon={icons.close} size="sm" aria-hidden />
        </IconButton>
      </div>
      <Input
        autoFocus
        value={text}
        onChange={setText}
        rows={5}
        multiline
        variant="support"
        placeholder="¿Qué recuerdas de este momento? Escríbelo para que la familia lo guarde..."
        inputClassName="rounded-2xl text-sm placeholder:text-muted-foreground/60 leading-relaxed"
      />
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} className="flex-1 text-sm">
          Cancelar
        </Button>
        <Button
          onClick={() => onSave(text)}
          disabled={!text.trim()}
          className="flex-1 text-sm"
        >
          Guardar recuerdo
        </Button>
      </div>
    </BottomSheetModal>
  );
}
