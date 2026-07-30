import React from 'react';
import { cn } from '@/design-system/components/ui/utils';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number';
  helperText?: string;
  multiline?: boolean;
  rows?: number;
  variant?: 'default' | 'photoViewerMemory';
  id?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  inputRef?: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  style?: React.CSSProperties;
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
  inputRef,
  onFocus,
  onBlur,
  onKeyDown,
  style,
}: InputProps) {
  const baseStyles = variant === 'photoViewerMemory'
    ? 'w-full bg-transparent px-4 py-3 text-sm leading-relaxed text-background placeholder:text-background/50 resize-none focus:outline-none disabled:opacity-50'
    : 'w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all disabled:opacity-50';
  
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm text-foreground">{label}</label>
      )}
      {multiline ? (
        <textarea
          id={id}
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
          className={cn(baseStyles, variant === 'default' && 'resize-none', inputClassName)}
        />
      ) : (
        <input
          id={id}
          ref={inputRef as React.Ref<HTMLInputElement>}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus as React.FocusEventHandler<HTMLInputElement>}
          onBlur={onBlur as React.FocusEventHandler<HTMLInputElement>}
          onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLInputElement>}
          placeholder={placeholder}
          min={min}
          max={max}
          disabled={disabled}
          style={style}
          className={cn(baseStyles, inputClassName)}
        />
      )}
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
