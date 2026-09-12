import React, { useEffect, useRef } from 'react';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { TabButton } from '@/design-system/components/navigation/TabButton';

export interface TabbarTab {
  key: string;
  label: string;
  count?: number;
}

interface TabbarProps {
  tabs: TabbarTab[];
  active: string;
  onChange: (key: string) => void;
  /** Altura del header/hero de encima, para desplazar el offset del sticky — normalmente
   * viene de `useElementHeight` sobre el `PageHeader`. */
  top?: number;
  /** Oculta solo la franja de pestañas, manteniendo el contenido — usado por PhotosView
   * mientras está en modo de selección de fotos. */
  hideStrip?: boolean;
  children: React.ReactNode;
}

// Franja de pestañas sticky + contenido. Antes el contenido también tenía swipe horizontal
// (arrastrar para cambiar de pestaña, vía motion.div drag="x") pero ese gesto nunca llegó a
// usarse y competía con el scroll/pan horizontal interno de contenido como el árbol
// genealógico (ver FamilyTreeView) — se quitó por completo en vez de intentar coordinarlos.
export function Tabbar({ tabs, active, onChange, top = 0, hideStrip, children }: TabbarProps) {
  // Cada pestaña recuerda su propio scroll — sin esto, cambiar de pestaña dejaba el scroll de
  // la pestaña de origen tal cual, así que la de destino aparecía a mitad de camino en vez de
  // arriba. Se guarda en el propio clic de cambio de pestaña, el único momento en que
  // `active` todavía es la pestaña saliente y window.scrollY todavía refleja su posición — un
  // efecto sobre el cambio de `active` llegaría tarde, después de que React ya haya pintado el
  // contenido de la nueva pestaña. Vive en memoria del componente, no en localStorage: no hace
  // falta que sobreviva a un remount (volver a esta pantalla ya reinicia a la pestaña inicial).
  const scrollPositions = useRef<Record<string, number>>({});

  const switchTab = (key: string) => {
    scrollPositions.current[active] = window.scrollY;
    onChange(key);
  };

  // Retoma el scroll guardado de la pestaña que se acaba de activar — 0 (arriba) la primera
  // vez que se visita, como pide la UX. Solo cuando cambia `active`, no en cada render.
  useEffect(() => {
    window.scrollTo(0, scrollPositions.current[active] ?? 0);
  }, [active]);

  return (
    <>
      {!hideStrip && (
        <div className="sticky bg-background/90 backdrop-blur-sm z-[9] border-b border-border" style={{ top }}>
          <PageContainer className="overflow-x-auto scrollbar-hide">
            <div className="flex w-max md:w-full">
              {tabs.map((tab) => (
                <TabButton
                  key={tab.key}
                  label={tab.label}
                  count={tab.count ?? 0}
                  active={tab.key === active}
                  onClick={() => switchTab(tab.key)}
                />
              ))}
            </div>
          </PageContainer>
        </div>
      )}

      {children}
    </>
  );
}
