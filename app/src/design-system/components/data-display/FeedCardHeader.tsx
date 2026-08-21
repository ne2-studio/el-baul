import React from 'react';
import { getRelativeTime } from '@/app/utils/timeUtils';
import { Avatar } from '@/design-system/components/data-display/Avatar';

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

// Shared "who did what, when" header for feed cards (recuerdos, photo-upload batches) — avatar,
// author + action text on one line, relative time on its own line below (so a long name/action
// never fights the timestamp for space and gets truncated), with a trailing slot for per-card
// actions. Purely presentational (design-system, no feature/store deps) so features that don't
// otherwise share code (memories' RecuerdoFeedCard, photos' PhotoBatchCard) render an identical
// header without depending on each other.
export function FeedCardHeader({ name, avatarUrl, actionText, timestamp, onAvatarClick, trailing }: FeedCardHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <Avatar name={name} src={avatarUrl} size={8} initialsVariant="colored" onClick={onAvatarClick} alwaysButton />
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
