import React from 'react';
import { ImageIcon, Pencil, Share2 } from 'lucide-react';
import { Recuerdo } from '@/types';
import { Button } from '@/design-system/components/actions/Button';
import { ChapterBadge, NewDot } from '@/design-system/components/data-display/Badges';
import { FeedCardHeader } from '@/design-system/components/data-display/FeedCardHeader';
import { cn } from '@/design-system/components/ui/utils';
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
  /** Actividad desde la última visita a este baúl — pinta un hint visual sutil (ver
   * FeedItem.isNew). Ausente fuera del feed unificado del baúl. */
  isNew?: boolean;
}

// Determina si el texto es lo bastante largo como para necesitar el toggle "Ver más"
// cuando se colapsa a 4 líneas. Aproximación por longitud de caracteres (no mide el
// overflow real renderizado), igual que el heurístico de RecuerdoCard mismo pero
// recalibrado para 4 líneas en el tamaño/fuente de esta card (text-sm font-serif).
const LONG_TEXT_THRESHOLD = 200;

export function RecuerdoFeedCard({
  recuerdo, onUserClick, onPhotoClick, onChapterClick, onShareRecuerdo, onEditRecuerdo, showChapterBadge = true,
  isNew = false,
}: RecuerdoFeedCardProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const userName = recuerdo.isOwn ? 'Yo' : (recuerdo.userName || 'Usuario desconocido');
  const canOpenPersona = !!(recuerdo.personaId && onUserClick);
  const canEdit = !!(recuerdo.isOwn && onEditRecuerdo);
  const showBadge = showChapterBadge && !recuerdo.photoId && !!recuerdo.chapterId;
  const isLongText = recuerdo.text.length > LONG_TEXT_THRESHOLD;

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
    <div className={cn(
      'relative rounded-2xl p-5 border',
      isNew ? 'bg-primary/5 border-primary/20' : 'bg-card border-border/60',
    )}>
      {isNew && <NewDot className="absolute top-4 right-4" />}
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
          <div className="relative mt-3">
            <p className={cn(
              'text-sm text-foreground/90 leading-relaxed font-serif',
              !isExpanded && isLongText ? 'line-clamp-4' : '',
            )}>
              {recuerdo.text}
            </p>

            {!isExpanded && isLongText && (
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none" />
            )}
          </div>

          {isLongText && (
            <Button variant="plain"
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground text-sm mt-1 transition-colors relative group/more"
            >
              <span className="relative">
                {isExpanded ? 'Ver menos' : 'Ver más'}
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-foreground/40 group-hover/more:w-full transition-all duration-300" />
              </span>
            </Button>
          )}

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
