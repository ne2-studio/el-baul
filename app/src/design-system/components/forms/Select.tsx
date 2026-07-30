import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/design-system/components/ui/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  helperText?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  containerClassName?: string;
  labelClassName?: string;
}

export function Select({
  label,
  helperText,
  options,
  value,
  onChange,
  id,
  containerClassName,
  labelClassName,
  className,
  ...props
}: SelectProps) {
  return (
    <div className={cn('space-y-2', containerClassName)}>
      {label && (
        <label htmlFor={id} className={cn('block text-sm text-foreground', labelClassName)}>
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'w-full appearance-none rounded-xl border border-border bg-input-background px-4 py-3 pr-10 text-sm text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50',
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </div>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}
