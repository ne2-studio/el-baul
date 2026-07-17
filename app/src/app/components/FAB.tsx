import React, { useState } from 'react';
import { Plus } from 'lucide-react';

// ─── Simple FAB (single action) ───────────────────────────────────────────────
interface SimpleFABProps {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  hidden?: boolean;
}

export function SimpleFAB({ label, icon, onClick, hidden }: SimpleFABProps) {
  if (hidden) return null;
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-5 z-30 flex items-center gap-2.5 bg-primary text-primary-foreground rounded-full shadow-lg px-5 py-3.5 active:scale-95 hover:bg-primary/90 transition-all"
      style={{ boxShadow: '0 4px 20px rgba(198,123,92,0.4)' }}
    >
      {icon ?? <Plus className="w-5 h-5" />}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// ─── Expandable FAB (multiple actions) ────────────────────────────────────────
export interface FABAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface ExpandableFABProps {
  actions: FABAction[];
  hidden?: boolean;
}

export function ExpandableFAB({ actions, hidden }: ExpandableFABProps) {
  const [open, setOpen] = useState(false);

  if (hidden) return null;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Action items — slide up above the FAB */}
      <div className="fixed bottom-[5.5rem] right-5 z-30 flex flex-col items-end gap-3">
        {open && actions.map((action, i) => (
          <button
            key={i}
            onClick={() => { setOpen(false); action.onClick(); }}
            className="flex items-center gap-3 bg-card border border-border rounded-full shadow-md pl-4 pr-2 py-2 animate-fab-item"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              {action.label}
            </span>
            <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center shrink-0 text-primary-foreground">
              {action.icon}
            </div>
          </button>
        ))}
      </div>

      {/* Main FAB button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-5 z-30 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center active:scale-95 hover:bg-primary/90 transition-all"
        style={{ boxShadow: '0 4px 20px rgba(198,123,92,0.4)' }}
        aria-label={open ? 'Cerrar menú' : 'Acciones'}
      >
        <div className={`transition-transform duration-200 ${open ? 'rotate-45' : 'rotate-0'}`}>
          <Plus className="w-6 h-6" />
        </div>
      </button>
    </>
  );
}
