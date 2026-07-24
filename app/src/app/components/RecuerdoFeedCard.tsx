import React from 'react';
import { ImageIcon } from 'lucide-react';
import { Recuerdo } from '@/types';
import { getRelativeTime } from '../utils/timeUtils';

interface RecuerdoFeedCardProps {
  recuerdo: Recuerdo;
  onUserClick?: (personaId: string) => void;
  onPhotoClick?: () => void;
  onChapterClick?: (chapterId: string) => void;
  /** false cuando la card ya se muestra dentro del propio capítulo al que pertenece el
   * recuerdo, para no repetir un badge que enlazaría al sitio en el que ya estás. */
  showChapterBadge?: boolean;
}

const AVATAR_COLORS = [
  'bg-primary/20 text-primary',
  'bg-blue-500/20 text-blue-500',
  'bg-green-500/20 text-green-600',
  'bg-purple-500/20 text-purple-500',
  'bg-orange-500/20 text-orange-500',
  'bg-pink-500/20 text-pink-500',
];

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function RecuerdoFeedCard({
  recuerdo, onUserClick, onPhotoClick, onChapterClick, showChapterBadge = true,
}: RecuerdoFeedCardProps) {
  const userName = recuerdo.isOwn ? 'Yo' : (recuerdo.userName || 'Usuario desconocido');
  const canOpenPersona = !!(recuerdo.personaId && onUserClick);
  const showBadge = showChapterBadge && !recuerdo.photoId && !!recuerdo.chapterId;

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5">
      <p className="text-sm text-foreground/90 leading-relaxed font-serif">{recuerdo.text}</p>

      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          data-testid="recuerdo-avatar"
          onClick={canOpenPersona ? () => onUserClick!(recuerdo.personaId!) : undefined}
          disabled={!canOpenPersona}
          className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium overflow-hidden ${getAvatarColor(userName)} ${canOpenPersona ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
        >
          {recuerdo.userAvatar ? (
            <img src={recuerdo.userAvatar} alt={userName} className="w-full h-full object-cover rounded-full" />
          ) : (
            getInitials(userName)
          )}
        </button>
        <p className="text-sm font-medium text-foreground truncate">{userName}</p>
        <p className="text-xs text-muted-foreground shrink-0">· {getRelativeTime(new Date(recuerdo.createdAt))}</p>
      </div>

      {recuerdo.photoId && (
        <button
          type="button"
          data-testid="recuerdo-photo"
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
        </button>
      )}

      {showBadge && (
        <button
          type="button"
          data-testid="recuerdo-chapter-badge"
          onClick={() => onChapterClick?.(recuerdo.chapterId!)}
          className="mt-2 inline-flex text-xs text-primary bg-primary/10 hover:bg-primary/15 transition-colors rounded-full px-2 py-0.5"
        >
          en «{recuerdo.chapterName ?? 'un capítulo'}»
        </button>
      )}
    </div>
  );
}
