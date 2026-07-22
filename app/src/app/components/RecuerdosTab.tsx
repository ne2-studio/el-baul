import React from 'react';
import { MessageCircle, ImageIcon } from 'lucide-react';
import { Recuerdo } from '@/types';
import { EmptyState } from './EmptyState';
import { getRelativeTime } from '../utils/timeUtils';

interface RecuerdosTabProps {
  recuerdos: Recuerdo[];
  onOpenAlbum?: (albumId: string) => void;
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

export function RecuerdosTab({ recuerdos, onOpenAlbum }: RecuerdosTabProps) {
  if (recuerdos.length === 0) {
    return (
      <EmptyState
        icon={<MessageCircle className="w-20 h-20" strokeWidth={1.5} />}
        title="Todavía no hay recuerdos"
        subtitle="Añade el primero desde el botón de abajo"
      />
    );
  }

  return (
    <div className="space-y-4">
      {recuerdos.map((recuerdo) => {
        const userName = recuerdo.isOwn ? 'Tú' : (recuerdo.userName || 'Usuario desconocido');

        return (
          <div key={recuerdo.id} className="flex gap-3 items-start bg-card rounded-2xl p-4">
            <div
              className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium overflow-hidden ${getAvatarColor(userName)}`}
            >
              {recuerdo.userAvatar ? (
                <img src={recuerdo.userAvatar} alt={userName} className="w-full h-full object-cover" />
              ) : (
                getInitials(userName)
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-foreground text-base leading-relaxed">{recuerdo.text}</p>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <p className="text-muted-foreground text-xs">
                  {userName} · {getRelativeTime(new Date(recuerdo.createdAt))}
                </p>

                {recuerdo.photoId && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                    {recuerdo.photoThumbnailUrl ? (
                      <img src={recuerdo.photoThumbnailUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                    ) : (
                      <ImageIcon className="w-3 h-3" strokeWidth={1.5} />
                    )}
                    en una foto
                  </span>
                )}

                {!recuerdo.photoId && recuerdo.albumId && (
                  <button
                    onClick={() => onOpenAlbum?.(recuerdo.albumId!)}
                    className="text-xs text-primary bg-primary/10 hover:bg-primary/15 transition-colors rounded-full px-2 py-0.5"
                  >
                    en «{recuerdo.albumName ?? 'un capítulo'}»
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
