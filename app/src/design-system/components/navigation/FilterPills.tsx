import { Button } from '@/design-system/components/actions/Button';
import { cn } from '@/design-system/components/ui/utils';

interface FilterPillsOption<T extends string> {
  value: T;
  label: string;
}

interface FilterPillsProps<T extends string> {
  options: FilterPillsOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

// Generic single-select pill group (e.g. "Sin capítulo" / "Todas" in BaulPhotosTabContainer) —
// same active/inactive language as Badges.tsx's RoleBadge (filled primary vs. hairline beige),
// but interactive and grouped, so it lives in navigation/ next to TabButton rather than
// data-display/.
export function FilterPills<T extends string>({ options, value, onChange, className }: FilterPillsProps<T>) {
  return (
    <div role="group" className={cn('flex gap-2', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Button
            key={option.value}
            variant="plain"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-foreground hover:bg-secondary/50',
            )}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
