import React from 'react';

interface TabButtonProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

export function TabButton({ label, count, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 py-3.5 px-1 mr-7 text-sm font-medium transition-colors ${
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70'
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium transition-colors ${
          active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
        }`}>
          {count}
        </span>
      )}
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
    </button>
  );
}
