export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Semantic size scale for icons. There is no existing icon-size token in
 * theme.css (only font-size and radius scales exist), so this is the scale
 * icon usage across the app should converge on instead of ad hoc width/height
 * utility classes chosen per call site.
 */
export const ICON_SIZE_CLASSES: Record<IconSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};
