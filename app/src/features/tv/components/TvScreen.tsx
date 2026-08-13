import React from 'react';

// Shared full-bleed, dark chrome for every Modo TV screen (landing, expired, empty, loading) —
// deliberately not a responsive reuse of the mobile app's own layout, see docs PRD "Modo TV".
export function TvScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-foreground flex flex-col items-center justify-center gap-4 px-10">
      {children}
    </div>
  );
}
