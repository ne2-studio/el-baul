import React from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { cn } from '@/design-system/components/ui/utils';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'inverse';
  badgeDot?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({
  children,
  size = 'md',
  tone = 'default',
  badgeDot = false,
  className,
  disabled,
  ...props
}, ref) {
  const sizeStyles = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };
  const toneStyles = {
    default: 'text-muted-foreground hover:text-foreground hover:bg-secondary',
    inverse: 'bg-background/10 text-background hover:bg-background/20',
  };

  return (
    <Button
      ref={ref}
      variant="plain"
      disabled={disabled}
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50',
        sizeStyles[size],
        toneStyles[tone],
        className,
      )}
      {...props}
    >
      {children}
      {badgeDot && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
    </Button>
  );
});
