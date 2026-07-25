import React from 'react';
import { cn } from '@/design-system/components/ui/utils';

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/** Shared width constraint for every top-level screen — keep in sync across
 * the app so screens line up visually. 62rem fits 3 album/persona cards per
 * row (grid-cols-3, gap-4) at roughly the same card width the old 2-column
 * max-w-2xl layout produced. */
export function PageContainer({ className, children, ...props }: PageContainerProps) {
  return (
    <div className={cn('max-w-[62rem] mx-auto px-6', className)} {...props}>
      {children}
    </div>
  );
}
