import React, { useEffect, useRef } from 'react';
import { motion, type PanInfo } from 'motion/react';
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
  /** Oculta solo la franja de pestañas manteniendo el swipe del contenido — usado por
   * PhotosView mientras está en modo de selección de fotos. */
  hideStrip?: boolean;
  children: React.ReactNode;
}

const SWIPE_THRESHOLD = 80;

// Franja de pestañas sticky + contenedor con swipe horizontal para cambiar de pestaña,
// igual que hacían por separado ChaptersView/PhotosView/PersonaDetailScreen antes de esta
// extracción. El swipe queda restringido al eje X (dragConstraints en 0) para no desplazar
// visualmente el contenido — solo se usa para detectar el gesto, igual que PhotoStage.
export function Tabbar({ tabs, active, onChange, top = 0, hideStrip, children }: TabbarProps) {
  const activeIndex = tabs.findIndex((tab) => tab.key === active);

  // Cada pestaña recuerda su propio scroll — sin esto, cambiar de pestaña dejaba el scroll de
  // la pestaña de origen tal cual, así que la de destino aparecía a mitad de camino en vez de
  // arriba. Se guarda en el propio gesto de cambio (clic o swipe), el único momento en que
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

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD && activeIndex < tabs.length - 1) {
      switchTab(tabs[activeIndex + 1].key);
    } else if (info.offset.x > SWIPE_THRESHOLD && activeIndex > 0) {
      switchTab(tabs[activeIndex - 1].key);
    }
  };

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

      <motion.div
        drag={tabs.length > 1 ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </>
  );
}
