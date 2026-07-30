import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/design-system/components/ui/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'plain';
  className?: string;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  iconOnly?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  children,
  variant = 'primary',
  onClick,
  type = 'button',
  className = '',
  fullWidth = false,
  disabled = false,
  isLoading = false,
  leftIcon,
  iconOnly = false,
  ...props
}, ref) {
  const baseStyles = "px-6 py-3 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2";
  const iconOnlyStyles = "w-11 h-11 p-0 rounded-xl";
  
  const variantStyles = {
    primary: "bg-primary text-primary-foreground enabled:hover:opacity-90 shadow-sm",
    secondary: "border border-border text-foreground enabled:hover:bg-secondary",
    ghost: "text-foreground enabled:hover:bg-secondary",
    danger: "bg-destructive text-destructive-foreground enabled:hover:opacity-90 shadow-sm",
    plain: ""
  };
  
  const widthStyles = fullWidth ? "w-full" : "";
  const disabledStyles = disabled || isLoading ? "opacity-50 cursor-not-allowed" : "";
  const styles = variant === 'plain'
    ? cn(widthStyles, disabledStyles, className)
    : cn(baseStyles, variantStyles[variant], iconOnly && iconOnlyStyles, widthStyles, disabledStyles, className);
  
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={styles}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!isLoading && leftIcon}
      {children}
    </button>
  );
});
