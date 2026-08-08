import React from 'react';
import { getRelativeTime } from '@/app/utils/timeUtils';
import { Button } from '@/design-system/components/actions/Button';

interface FeedCardHeaderProps {
  /** Author display name — already resolved by the caller ('Yo' for the current user, the
   * Persona nickname otherwise). */
  name: string;
  avatarUrl?: string;
  /** What the author did, e.g. "dejó un recuerdo" / "subió 6 fotos" — combined with `name` into
   * one line: "<name> <actionText>". */
  actionText: string;
  timestamp: string;
  onAvatarClick?: () => void;
  /** Right-aligned slot for per-card actions (edit/share, "···" menus). */
  trailing?: React.ReactNode;
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

// Shared "who did what, when" header for feed cards (recuerdos, photo-upload batches) — avatar,
// author + action text on one line, relative time on its own line below (so a long name/action
// never fights the timestamp for space and gets truncated), with a trailing slot for per-card
// actions. Purely presentational (design-system, no feature/store deps) so features that don't
// otherwise share code (memories' RecuerdoFeedCard, photos' PhotoBatchCard) render an identical
// header without depending on each other.
export function FeedCardHeader({ name, avatarUrl, actionText, timestamp, onAvatarClick, trailing }: FeedCardHeaderProps) {
  const canOpenAvatar = !!onAvatarClick;

  return (
    <div className="flex items-center gap-2">
      <Button variant="plain"
        type="button"
        aria-label={`Ver perfil de ${name}`}
        onClick={onAvatarClick}
        disabled={!canOpenAvatar}
        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium overflow-hidden ${getAvatarColor(name)} ${canOpenAvatar ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover rounded-full" />
        ) : (
          getInitials(name)
        )}
      </Button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">
          <span className="font-medium">{name}</span> {actionText}
        </p>
        <p className="text-xs text-muted-foreground">{getRelativeTime(new Date(timestamp))}</p>
      </div>
      {trailing}
    </div>
  );
}
