import type { LucideIcon, LucideProps } from 'lucide-react';
import { cn } from '@/design-system/components/ui/utils';
import { ICON_SIZE_CLASSES, type IconSize } from '@/design-system/foundations/icons/iconSizes';

type IconPassthroughProps = Omit<
  LucideProps,
  'ref' | 'size' | 'className' | 'aria-hidden' | 'aria-label'
>;

interface IconBaseProps extends IconPassthroughProps {
  /** The lucide icon component to render, e.g. `icon={icons.delete}`. */
  icon: LucideIcon;
  /** Semantic size. Defaults to `md`. Pass a `className` with explicit
   * `w-*`/`h-*` utilities only when a real one-off need exists. */
  size?: IconSize;
  className?: string;
}

/**
 * Every icon is either decorative (hidden from assistive tech because its
 * meaning is already conveyed elsewhere, e.g. next to a text label or inside
 * a button that already has its own accessible name) or informative (has
 * meaning on its own and needs an accessible name). The type forces callers
 * to pick one explicitly instead of silently doing neither.
 */
export type IconProps = IconBaseProps &
  (
    | { 'aria-hidden': true; 'aria-label'?: never }
    | { 'aria-label': string; 'aria-hidden'?: never }
  );

/**
 * Base component for rendering any icon in the app. Centralizes size,
 * color (via `currentColor`, inherited from the surrounding text color) and
 * accessible behavior so individual call sites don't each reinvent them.
 */
export function Icon({ icon: IconComponent, size = 'md', className, ...rest }: IconProps) {
  return <IconComponent className={cn(ICON_SIZE_CLASSES[size], className)} {...rest} />;
}

export type { IconSize };
