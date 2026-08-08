import React from 'react';
import { ImageIcon, Pencil, Share2 } from 'lucide-react';
import { Recuerdo } from '@/types';
import { Button } from '@/design-system/components/actions/Button';
import { ChapterBadge } from '@/design-system/components/data-display/Badges';
import { FeedCardHeader } from '@/design-system/components/data-display/FeedCardHeader';
import { RecuerdoEditForm } from '@/features/memories/components/RecuerdoEditForm';

interface RecuerdoFeedCardProps {
  recuerdo: Recuerdo;
  onUserClick?: (personaId: string) => void;
  onPhotoClick?: () => void;
  onChapterClick?: (chapterId: string) => void;
  onShareRecuerdo?: (recuerdo: Recuerdo) => void;
  onEditRecuerdo?: (recuerdo: Recuerdo, text: string) => Promise<boolean> | boolean | void;
  /** false cuando la card ya se muestra dentro del propio capítulo al que pertenece el
   * recuerdo, para no repetir un badge que enlazaría al sitio en el que ya estás. */
  showChapterBadge?: boolean;
}

export function RecuerdoFeedCard({
  recuerdo, onUserClick, onPhotoClick, onChapterClick, onShareRecuerdo, onEditRecuerdo, showChapterBadge = true,
}: RecuerdoFeedCardProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const userName = recuerdo.isOwn ? 'Yo' : (recuerdo.userName || 'Usuario desconocido');
  const canOpenPersona = !!(recuerdo.personaId && onUserClick);
  const canEdit = !!(recuerdo.isOwn && onEditRecuerdo);
  const showBadge = showChapterBadge && !recuerdo.photoId && !!recuerdo.chapterId;

  const handleSave = async (text: string) => {
    if (!onEditRecuerdo) return;
    setIsSaving(true);
    try {
      const ok = (await onEditRecuerdo(recuerdo, text)) ?? true;
      if (ok) setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5">
      <FeedCardHeader
        name={userName}
        avatarUrl={recuerdo.userAvatar}
        actionText="dejó un recuerdo"
        timestamp={recuerdo.createdAt}
        onAvatarClick={canOpenPersona ? () => onUserClick!(recuerdo.personaId!) : undefined}
        trailing={!isEditing && (canEdit || onShareRecuerdo) ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            {canEdit && (
              <Button variant="plain"
                type="button"
                aria-label="Editar recuerdo"
                onClick={() => setIsEditing(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Pencil className="w-4 h-4" strokeWidth={1.5} />
              </Button>
            )}
            {onShareRecuerdo && (
              <Button variant="plain"
                type="button"
                aria-label="Compartir recuerdo"
                onClick={() => onShareRecuerdo(recuerdo)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Share2 className="w-4 h-4" strokeWidth={1.5} />
              </Button>
            )}
          </div>
        ) : undefined}
      />

      {isEditing ? (
        <div className="mt-3">
          <RecuerdoEditForm
            initialText={recuerdo.text}
            isSaving={isSaving}
            onCancel={() => setIsEditing(false)}
            onSave={handleSave}
          />
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-foreground/90 leading-relaxed font-serif">{recuerdo.text}</p>

          {recuerdo.photoId && (
            <Button variant="plain"
              type="button"
              aria-label="Ver foto"
              onClick={onPhotoClick}
              className="mt-3 block w-full rounded-xl overflow-hidden hover:opacity-90 transition-opacity"
            >
              {recuerdo.photoThumbnailUrl ? (
                <img src={recuerdo.photoThumbnailUrl} alt="" className="w-full max-h-36 object-cover rounded-xl" />
              ) : (
                <span className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-secondary rounded-xl px-3 py-3">
                  <ImageIcon className="w-4 h-4" strokeWidth={1.5} />
                  Ver foto
                </span>
              )}
            </Button>
          )}

          {showBadge && (
            <ChapterBadge
              chapterName={recuerdo.chapterName}
              onClick={() => onChapterClick?.(recuerdo.chapterId!)}
              className="mt-2"
            />
          )}
        </>
      )}
    </div>
  );
}
