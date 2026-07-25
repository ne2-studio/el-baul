import React from 'react';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password';
  helperText?: string;
  multiline?: boolean;
  rows?: number;
}

export function Input({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  type = 'text',
  helperText,
  multiline = false,
  rows = 3
}: InputProps) {
  const baseStyles = "w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all";
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm text-foreground">{label}</label>
      )}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`${baseStyles} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={baseStyles}
        />
      )}
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
