import React from 'react';
import { Plus } from 'lucide-react';

interface FABProps {
  label: string;
  onClick: () => void;
}

export function FAB({ label, onClick }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-5 z-30 flex items-center gap-2.5 bg-primary text-primary-foreground rounded-full shadow-lg px-5 py-3.5 active:scale-95 hover:opacity-90 transition-all"
    >
      <Plus className="w-5 h-5" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
