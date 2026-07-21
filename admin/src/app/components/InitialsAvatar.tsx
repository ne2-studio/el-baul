import { initials } from '@/utils/format';

interface InitialsAvatarProps {
  name: string | undefined | null;
  fallback: string;
}

export function InitialsAvatar({ name, fallback }: InitialsAvatarProps) {
  return (
    <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs shrink-0">
      {initials(name, fallback)}
    </div>
  );
}
