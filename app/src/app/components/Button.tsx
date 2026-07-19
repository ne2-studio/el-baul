import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  onClick, 
  type = 'button',
  className = '',
  fullWidth = false,
  disabled = false,
  isLoading = false
}: ButtonProps) {
  const baseStyles = "px-6 py-3 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2";
  
  const variantStyles = {
    primary: "bg-primary text-primary-foreground hover:opacity-90 shadow-sm",
    secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
    ghost: "text-foreground hover:bg-secondary",
    danger: "bg-destructive text-destructive-foreground hover:opacity-90 shadow-sm"
  };
  
  const widthStyles = fullWidth ? "w-full" : "";
  const disabledStyles = disabled || isLoading ? "opacity-50 cursor-not-allowed" : "";
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles[variant]} ${widthStyles} ${disabledStyles} ${className}`}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}