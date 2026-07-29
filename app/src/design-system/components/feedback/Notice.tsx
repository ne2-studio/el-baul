import React from 'react';
import { cn } from '@/design-system/components/ui/utils';

type NoticeVariant = 'neutral' | 'destructive';
type NoticeSize = 'sm' | 'md';

interface NoticeProps {
  variant?: NoticeVariant;
  /** 'sm' para hojas modales compactas (confirmaciones), 'md' para pantallas completas. */
  size?: NoticeSize;
  /** El icono ya debe traer su propio tamaño y color (p. ej. `<Heart className="w-5 h-5 text-primary" />`). */
  icon?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<NoticeVariant, { container: string; text: string }> = {
  neutral: { container: 'bg-muted/50', text: 'text-muted-foreground' },
  destructive: { container: 'bg-destructive/8 border border-destructive/20', text: 'text-destructive/80' },
};

const SIZE_CLASSES: Record<NoticeSize, { container: string; text: string }> = {
  sm: { container: 'p-3', text: 'text-xs' },
  md: { container: 'p-4', text: 'text-sm' },
};

export function Notice({ variant = 'neutral', size = 'md', icon, align = 'left', className, children }: NoticeProps) {
  const variantClasses = VARIANT_CLASSES[variant];
  const sizeClasses = SIZE_CLASSES[size];

  return (
    <div className={cn('rounded-xl', variantClasses.container, sizeClasses.container, className)}>
      <div className={cn(icon && 'flex items-start gap-3')}>
        {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
        <p className={cn(sizeClasses.text, variantClasses.text, 'leading-relaxed', align === 'center' ? 'text-center' : 'text-left')}>
          {children}
        </p>
      </div>
    </div>
  );
}
