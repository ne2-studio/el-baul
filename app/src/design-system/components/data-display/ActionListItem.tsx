import React from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { cn } from '@/design-system/components/ui/utils';

interface ActionListItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  variant?: 'plain' | 'card' | 'destructive';
}

export function ActionListItem({
  icon,
  title,
  description,
  trailing,
  variant = 'plain',
  className,
  disabled,
  ...props
}: ActionListItemProps) {
  const destructive = variant === 'destructive';

  return (
    <Button
      variant="plain"
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left transition-colors disabled:opacity-50',
        variant === 'card' ? 'border border-border bg-card hover:shadow-md' : 'hover:bg-muted',
        destructive && 'hover:bg-destructive/10',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
          destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block font-medium', destructive ? 'text-destructive' : 'text-foreground')}>{title}</span>
        {description && <span className="block text-sm text-muted-foreground">{description}</span>}
      </span>
      {trailing && <span className="flex-shrink-0 text-muted-foreground">{trailing}</span>}
    </Button>
  );
}
