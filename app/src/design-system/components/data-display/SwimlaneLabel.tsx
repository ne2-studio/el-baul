import React from 'react';

interface SwimlaneLabelProps {
  children: React.ReactNode;
}

/** Etiqueta pequeña en mayúsculas que encabeza un grupo de tarjetas (año, mes, categoría...).
 * No acepta className para evitar que cada pantalla la desvíe con ajustes propios. */
export function SwimlaneLabel({ children }: SwimlaneLabelProps) {
  return (
    <div className="mb-3">
      <p
        className="text-xs text-muted-foreground uppercase tracking-wide"
        style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
      >
        {children}
      </p>
    </div>
  );
}
