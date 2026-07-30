import React from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { cn } from '@/design-system/components/ui/utils';

interface ActionBarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  children: React.ReactNode;
}

export function ActionBarButton({ icon, children, className, ...props }: ActionBarButtonProps) {
  return (
    <Button
      variant="plain"
      className={cn(
        'flex flex-col items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-border px-3 py-2 text-xs text-foreground transition-colors hover:bg-secondary',
        className,
      )}
      {...props}
    >
      <span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {children}
    </Button>
  );
}
