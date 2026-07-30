import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { cn } from '@/design-system/components/ui/utils';

interface SelectionRowProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
  control?: 'radio' | 'checkbox' | 'none';
  controlPosition?: 'left' | 'right';
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}

export function SelectionRow({
  selected,
  control = 'radio',
  controlPosition = 'left',
  leading,
  trailing,
  children,
  className,
  disabled,
  ...props
}: SelectionRowProps) {
  const controlNode = control !== 'none' && (
    <span
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-all',
        control === 'radio' ? 'rounded-full' : 'rounded-md',
        selected ? 'border-primary bg-primary' : 'border-border',
      )}
      aria-hidden
    >
      {selected && <Check className="h-3 w-3 text-white" />}
    </span>
  );

  return (
    <Button
      variant="plain"
      type="button"
      disabled={disabled}
      aria-pressed={props['aria-pressed'] ?? selected}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all disabled:opacity-60',
        selected ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-secondary/30',
        className,
      )}
      {...props}
    >
      {controlPosition === 'left' && controlNode}
      {leading}
      <span className="min-w-0 flex-1">{children}</span>
      {controlPosition === 'right' && controlNode}
      {trailing}
    </Button>
  );
}
