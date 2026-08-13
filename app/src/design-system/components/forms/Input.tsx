import React from 'react';
import { cn } from '@/design-system/components/ui/utils';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string, event?: React.ChangeEvent<HTMLInputElement>) => void;
  type?: 'text' | 'email' | 'password' | 'number';
  helperText?: string;
  multiline?: boolean;
  rows?: number;
  variant?: 'default' | 'modal' | 'support' | 'destructive' | 'inlineDark' | 'photoViewerMemory' | 'photoViewerMemoryLight';
  id?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  inputRef?: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  style?: React.CSSProperties;
  autoFocus?: boolean;
  'aria-label'?: string;
}

export function Input({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  type = 'text',
  helperText,
  multiline = false,
  rows = 3,
  variant = 'default',
  id,
  min,
  max,
  disabled,
  className,
  inputClassName,
  labelClassName,
  inputRef,
  onFocus,
  onBlur,
  onKeyDown,
  style,
  autoFocus,
  'aria-label': ariaLabel,
}: InputProps) {
  const inputVariantStyles = {
    default: 'w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all disabled:opacity-50',
    modal: 'w-full bg-secondary rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50',
    support: 'w-full min-h-[160px] p-4 bg-card border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all text-foreground placeholder:text-muted-foreground disabled:opacity-60',
    destructive: 'w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-destructive/40 placeholder:text-muted-foreground disabled:opacity-60',
    inlineDark: 'w-full rounded-2xl px-4 py-3 text-sm leading-relaxed resize-none outline-none border focus:ring-2 focus:ring-ring bg-background/10 border-background/15 text-background placeholder:text-background/40 disabled:opacity-50',
    photoViewerMemory: 'w-full bg-transparent px-4 py-3 text-sm leading-relaxed text-background placeholder:text-background/50 resize-none focus:outline-none disabled:opacity-50',
    // Mismo layout que photoViewerMemory pero con colores para fondo claro (fuera del visor de
    // fotos): RecuerdoInput con theme="light", ver WriteMemorySuggestionScreen.
    photoViewerMemoryLight: 'w-full bg-transparent px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground resize-none focus:outline-none disabled:opacity-50',
  };

  const baseStyles = inputVariantStyles[variant];
  const defaultLabelStyles = variant === 'modal'
    ? 'text-xs text-muted-foreground uppercase mb-1.5 block'
    : 'block text-sm text-foreground';
  
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label htmlFor={id} className={cn(defaultLabelStyles, labelClassName)}>{label}</label>
      )}
      {multiline ? (
        <textarea
          id={id}
          aria-label={ariaLabel}
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus as React.FocusEventHandler<HTMLTextAreaElement>}
          onBlur={onBlur as React.FocusEventHandler<HTMLTextAreaElement>}
          onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLTextAreaElement>}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          style={style}
          autoFocus={autoFocus}
          className={cn(baseStyles, variant === 'default' && 'resize-none', inputClassName)}
        />
      ) : (
        <input
          id={id}
          aria-label={ariaLabel}
          ref={inputRef as React.Ref<HTMLInputElement>}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value, e)}
          onFocus={onFocus as React.FocusEventHandler<HTMLInputElement>}
          onBlur={onBlur as React.FocusEventHandler<HTMLInputElement>}
          onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLInputElement>}
          placeholder={placeholder}
          min={min}
          max={max}
          disabled={disabled}
          style={style}
          autoFocus={autoFocus}
          className={cn(baseStyles, inputClassName)}
        />
      )}
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
