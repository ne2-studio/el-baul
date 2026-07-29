import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { cn } from '@/design-system/components/ui/utils';

interface BackButtonProps {
  onClick: () => void;
  /** Texto visible junto al icono. Si se omite, se renderiza como botón circular
   * solo-icono (con `aria-label="Volver"` para mantenerlo accesible). */
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function BackButton({ onClick, label, disabled, className }: BackButtonProps) {
  if (label) {
    return (
      <Button
        variant="plain"
        onClick={onClick}
        disabled={disabled}
        className={cn('flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors', className)}
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="text-sm">{label}</span>
      </Button>
    );
  }

  return (
    <Button
      variant="plain"
      onClick={onClick}
      disabled={disabled}
      aria-label="Volver"
      className={cn('w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors -ml-2', className)}
    >
      <ChevronLeft className="w-6 h-6 text-foreground" />
    </Button>
  );
}
