import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/design-system/components/actions/Button';
import { cn } from '@/design-system/components/ui/utils';

interface SwimlaneLabelProps {
  children: React.ReactNode;
  /** Presente cuando la etiqueta es interactiva (pulsarla selecciona/deselecciona todo el
   * grupo). En desktop, un check vacío se desliza desde la izquierda al pasar el ratón —
   * igual que en Google Photos — para dar a entender que es pulsable. */
  onClick?: () => void;
  /** Solo tiene sentido junto a `onClick`. Indicado (true/false), el check queda siempre
   * visible — relleno si el grupo está completo — en vez de aparecer solo al hacer hover.
   * Se usa mientras el modo de selección global está activo. */
  selected?: boolean;
}

/** Etiqueta pequeña en mayúsculas que encabeza un grupo de tarjetas (año, mes, categoría...).
 * No acepta className para evitar que cada pantalla la desvíe con ajustes propios. */
export function SwimlaneLabel({ children, onClick, selected }: SwimlaneLabelProps) {
  if (!onClick) {
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

  const checkAlwaysVisible = selected !== undefined;

  return (
    <Button
      variant="plain"
      type="button"
      onClick={onClick}
      className="group/swimlane-label flex items-center mb-3 -ml-0.5 px-0.5 py-0.5 rounded"
    >
      <span
        className={cn(
          'flex items-center justify-center flex-shrink-0 rounded-full border-2 overflow-hidden transition-all duration-200 ease-out',
          selected ? 'bg-primary border-primary' : 'bg-background/60 border-muted-foreground/40',
          checkAlwaysVisible
            ? 'w-3.5 h-3.5 mr-1.5 opacity-100'
            : 'w-0 h-0 mr-0 opacity-0 group-hover/swimlane-label:w-3.5 group-hover/swimlane-label:h-3.5 group-hover/swimlane-label:mr-1.5 group-hover/swimlane-label:opacity-100'
        )}
      >
        {selected && <Check className="w-2.5 h-2.5 text-white" />}
      </span>
      <p
        className="text-xs text-muted-foreground uppercase tracking-wide group-hover/swimlane-label:text-foreground transition-colors"
        style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}
      >
        {children}
      </p>
    </Button>
  );
}
