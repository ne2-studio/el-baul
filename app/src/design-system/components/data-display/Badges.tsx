import { BaulRole } from '@/types';
import { cn } from '@/design-system/components/ui/utils';
import { getRoleDisplayName } from '@/utils/roleUtils';
import { Avatar } from '@/design-system/components/data-display/Avatar';

interface ChapterBadgeProps {
  chapterName?: string;
  onClick?: () => void;
  className?: string;
}

export function ChapterBadge({ chapterName, onClick, className }: ChapterBadgeProps) {
  const label = `en «${chapterName ?? 'un capítulo'}»`;
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn('inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary transition-colors hover:bg-primary/15', className)}
      >
        {label}
      </button>
    );
  }

  return (
    <span className={cn('inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary', className)}>
      {label}
    </span>
  );
}

interface PersonBadgeProps {
  nickname: string;
  avatarUrl?: string;
  onClick?: () => void;
  className?: string;
}

export function PersonBadge({ nickname, avatarUrl, onClick, className }: PersonBadgeProps) {
  const content = (
    <>
      <Avatar name={nickname} src={avatarUrl} size={6} className="bg-background/20 text-background/70" />
      <span className="text-xs text-background/80">{nickname}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn('inline-flex items-center gap-1.5 rounded-full bg-background/10 py-1 pl-1 pr-3 transition-colors hover:bg-background/20', className)}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-background/10 py-1 pl-1 pr-3', className)}>
      {content}
    </span>
  );
}

interface RoleBadgeProps {
  role: BaulRole;
  /** True for the baúl's custodio — a legal-custody relationship, not a role value (see
   * BaulRole in types/index.ts), so it overrides the role label rather than being one. */
  isCustodio?: boolean;
  tone?: 'default' | 'onImage';
  className?: string;
}

export function RoleBadge({ role, isCustodio = false, tone = 'default', className }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-1 text-xs font-medium',
        tone === 'onImage' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary',
        className,
      )}
    >
      {isCustodio ? 'Custodio' : getRoleDisplayName(role)}
    </span>
  );
}

interface CounterBadgeProps {
  count: number;
  className?: string;
}

export function CounterBadge({ count, className }: CounterBadgeProps) {
  return (
    <span className={cn('inline-flex rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-white', className)}>
      {count}
    </span>
  );
}

// "This is new" marker for feed cards not yet seen by the caller (see FeedItem.isNew) — a
// dot-only sibling of CounterBadge, which always carries a number.
export function NewDot({ className }: { className?: string }) {
  return <span aria-hidden className={cn('block h-2 w-2 rounded-full bg-primary', className)} />;
}
