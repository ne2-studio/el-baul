import React from 'react';
import { cn } from '@/design-system/components/ui/utils';

interface StickyHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/** Shared sticky top bar shell used by every screen header. */
export const StickyHeader = React.forwardRef<HTMLDivElement, StickyHeaderProps>(
  function StickyHeader({ className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('sticky top-0 pt-safe bg-background/80 backdrop-blur-sm border-b border-border z-10', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
