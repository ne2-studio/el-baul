import React from 'react';
import { MessageCircle, ImageIcon } from 'lucide-react';
import { Recuerdo } from '@/types';
import { EmptyState } from './EmptyState';
import { getRelativeTime } from '../utils/timeUtils';

interface RecuerdosTabProps {
  recuerdos: Recuerdo[];
  onOpenAlbum?: (albumId: string) => void;
  onOpenPhoto?: (photoId: string, albumId?: string) => void;
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

export function RecuerdosTab({ recuerdos, onOpenAlbum, onOpenPhoto }: RecuerdosTabProps) {
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

              <p className="text-muted-foreground text-xs mt-2">
                {userName} · {getRelativeTime(new Date(recuerdo.createdAt))}
              </p>

              {recuerdo.photoId && (
                <button
                  onClick={() => onOpenPhoto?.(recuerdo.photoId!, recuerdo.albumId)}
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

              {!recuerdo.photoId && recuerdo.albumId && (
                <button
                  onClick={() => onOpenAlbum?.(recuerdo.albumId!)}
                  className="mt-2 inline-flex text-xs text-primary bg-primary/10 hover:bg-primary/15 transition-colors rounded-full px-2 py-0.5"
                >
                  en «{recuerdo.albumName ?? 'un capítulo'}»
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
