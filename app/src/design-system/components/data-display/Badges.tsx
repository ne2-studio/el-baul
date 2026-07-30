import { BaulRole } from '@/types';
import { cn } from '@/design-system/components/ui/utils';
import { getRoleDisplayName } from '@/utils/roleUtils';

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
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-[10px] text-background/70">
          {nickname.charAt(0).toUpperCase()}
        </span>
      )}
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
  tone?: 'default' | 'onImage';
  className?: string;
}

export function RoleBadge({ role, tone = 'default', className }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-1 text-xs font-medium',
        tone === 'onImage' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary',
        className,
      )}
    >
      {getRoleDisplayName(role)}
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
