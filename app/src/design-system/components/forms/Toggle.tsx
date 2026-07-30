import { cn } from '@/design-system/components/ui/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
}

export function Toggle({ checked, onChange, disabled, label, description, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex items-center gap-4 text-left disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {(label || description) && (
        <span className="min-w-0 flex-1">
          {label && <span className="block text-sm font-medium text-foreground">{label}</span>}
          {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
        </span>
      )}
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-primary' : 'bg-muted-foreground/30',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}
