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
        variant="ghost"
        onClick={onClick}
        disabled={disabled}
        leftIcon={<ChevronLeft className="w-5 h-5" aria-hidden />}
        className={cn('px-0 py-0 text-muted-foreground hover:text-foreground hover:bg-transparent', className)}
      >
        <span className="text-sm">{label}</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      iconOnly
      onClick={onClick}
      disabled={disabled}
      aria-label="Volver"
      className={cn('h-10 w-10 rounded-full -ml-2', className)}
    >
      <ChevronLeft className="w-6 h-6 text-foreground" />
    </Button>
  );
}
