import React, { useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

export type ToastVariant = 'success' | 'error';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
  variant?: ToastVariant;
}

export function Toast({ message, onClose, duration = 3000, variant = 'success' }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  const isError = variant === 'error';
  const Icon = isError ? XCircle : CheckCircle;

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:w-96 md:-translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-card border border-border rounded-2xl shadow-lg px-6 py-4 flex items-center gap-3">
        <div className={`w-10 h-10 ${isError ? 'bg-destructive/10' : 'bg-primary/10'} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${isError ? 'text-destructive' : 'text-primary'}`} strokeWidth={1.5} />
        </div>
        <p className="text-foreground font-medium">{message}</p>
      </div>
    </div>
  );
}
