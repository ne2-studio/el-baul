import React from 'react';
import { cn } from '@/design-system/components/ui/utils';

interface ModalActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalActions({ children, className }: ModalActionsProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap-reverse gap-3 pt-1 [&>button]:min-w-max [&>button]:flex-1 [&>button]:whitespace-nowrap',
        className,
      )}
    >
      {children}
    </div>
  );
}
