import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { cn } from '@/design-system/components/ui/utils';

export type AvatarSize = 6 | 8 | 10 | 14 | 24;

const SIZE_CLASSES: Record<AvatarSize, string> = {
  6: 'w-6 h-6 text-[10px]',
  8: 'w-8 h-8 text-xs',
  10: 'w-10 h-10 text-sm',
  14: 'w-14 h-14 text-lg',
  24: 'w-24 h-24 text-2xl',
};

const INITIALS_COLORS = [
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

// Deterministic per-name color so the same person always gets the same fallback swatch across
// screens, without persisting anything — a hash of the name picked from a small fixed palette.
function getInitialsColor(name: string): string {
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return INITIALS_COLORS[index % INITIALS_COLORS.length];
}

interface AvatarProps {
  /** Person's display name — used for the accessible label and, when there's no `src`, to derive
   * the initials fallback. */
  name: string;
  src?: string;
  size?: AvatarSize;
  /** 'colored' derives a per-name background from `name` (feed-style — FeedCardHeader,
   * RecuerdoCard); 'plain' uses a flat muted background (list rows, badges, claim screen).
   * Ignored once `src` or `fallbackIcon` is set. Defaults to 'plain'. */
  initialsVariant?: 'colored' | 'plain';
  /** Renders instead of initials when there's no `src` — e.g. a generic `User` icon for "no
   * photo yet" states. Background/text color for this case come from `className`, since callers
   * disagree on it (muted list bg vs. tinted profile bg). */
  fallbackIcon?: LucideIcon;
  onClick?: () => void;
  /** Always render as a `<button>` (disabled when there's no `onClick`) instead of falling back
   * to a plain, non-interactive `div` — for callers that want a stable, consistently
   * announced/testable focus target regardless of whether the handler is available right now
   * (e.g. FeedCardHeader's "open persona" avatar). */
  alwaysButton?: boolean;
  className?: string;
}

// Circular avatar shared by every place that shows a Persona/user photo or its fallback — feed
// card headers, selection rows, badges, the claim-persona and profile screens. Renders `src`
// when present, otherwise falls back to initials (colored or plain, see `initialsVariant`) or
// `fallbackIcon`. Renders as a `Button` when `onClick` is given so the avatar itself is
// keyboard/screen-reader accessible, a plain `div` otherwise (the common case — most callers
// already wrap the avatar in their own clickable row/card).
export function Avatar({ name, src, size = 8, initialsVariant = 'plain', fallbackIcon: FallbackIcon, onClick, alwaysButton = false, className }: AvatarProps) {
  const content = src ? (
    <img src={src} alt={name} className="w-full h-full object-cover rounded-full" />
  ) : FallbackIcon ? (
    <FallbackIcon className="w-1/2 h-1/2" strokeWidth={1.5} />
  ) : (
    getInitials(name)
  );

  const fallbackColor = src || FallbackIcon
    ? ''
    : initialsVariant === 'colored' ? getInitialsColor(name) : 'bg-secondary text-muted-foreground';

  const classes = cn(
    SIZE_CLASSES[size],
    'rounded-full flex-shrink-0 flex items-center justify-center font-medium overflow-hidden',
    fallbackColor,
    className,
  );

  if (onClick || alwaysButton) {
    return (
      <Button
        variant="plain"
        type="button"
        aria-label={`Ver perfil de ${name}`}
        onClick={onClick}
        disabled={!onClick}
        className={cn(classes, onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default')}
      >
        {content}
      </Button>
    );
  }

  return <div className={classes}>{content}</div>;
}
