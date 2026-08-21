import React from 'react';
import { createPortal } from 'react-dom';
import { useVisualViewportInset } from '@/hooks/useVisualViewportInset';

interface BottomSheetModalProps {
  onCancel: () => void;
  children: React.ReactNode;
  /**
   * 'sm': hoja de confirmación/acción — rounded-t-2xl, max-w-md, p-6, fondo bg-background,
   * por encima de todo lo demás incluido el visor de fotos (z-[60]), salvo el `Toast`
   * (z-[70]), que se mantiene visible aunque la hoja siga abierta cuando dispara la acción.
   * Es el valor por defecto.
   * 'lg': hoja de formulario — rounded-t-3xl, max-w-2xl, más padding, fondo bg-card, con el
   * "handle" (barrita) arriba, z-50. En desktop (md+) pasa a un panel lateral fijo a la
   * derecha, a toda altura y ~1/3 del ancho, en vez de quedarse pegada abajo.
   */
  size?: 'sm' | 'lg';
  /** Solo aplica con size='sm': en escritorio (md+) pasa a diálogo centrado en vez de
   * quedarse pegada abajo. 'lg' no lo usa — en desktop siempre es el panel lateral descrito
   * arriba. */
  desktopCentered?: boolean;
  /** Opacidad del backdrop sobre bg-foreground — solo se usa con size='sm'; 'lg' usa
   * bg-black/50 fijo, igual que hasta ahora. */
  backdropOpacity?: 40 | 50 | 60;
  /**
   * Solo aplica con size='lg'. Cabecera fija que queda siempre por encima del contenido con
   * scroll — se renderiza fuera del contenedor con overflow-y-auto, así que no necesita
   * `sticky` ni el truco de cancelar el padding del contenedor con márgenes negativos
   * (`-mt-6 -mx-6`), que dos modales reimplementaban por su cuenta y que además rompía con
   * Tailwind v4: `space-y-*` y un margen negativo explícito tienen la misma especificidad, y
   * cuál gana depende del orden de generación de las clases, no de cuál aparece después en el
   * JSX. El resultado era una cabecera desplazada hacia abajo y fotos que al hacer scroll
   * quedaban por encima de ella.
   */
  header?: React.ReactNode;
}

// Contenedor compartido por todas las hojas ("bottom sheets") que se abren desde abajo de
// la pantalla: fondo + hoja deslizante con las esquinas superiores redondeadas, a todo el
// ancho en móvil. Antes cada modal reimplementaba este shell por su cuenta, y bastaba con
// que uno metiera un padding de más en el contenedor exterior (en vez de dejar que la hoja
// ocupe el ancho completo) para que se viera con "bordes" en vez de a pantalla completa —
// pasó con DeleteChapterModal. Los modales concretos solo aportan su contenido.
export function BottomSheetModal({
  onCancel,
  children,
  size = 'sm',
  desktopCentered = false,
  backdropOpacity = 50,
  header,
}: BottomSheetModalProps) {
  const isLg = size === 'lg';
  const viewportInset = useVisualViewportInset();

  const overlayBg = isLg
    ? 'bg-black/50'
    : backdropOpacity === 40 ? 'bg-foreground/40'
    : backdropOpacity === 60 ? 'bg-foreground/60'
    : 'bg-foreground/50';

  // Se porta a document.body: los menús "···" de baúl/capítulo/persona/foto viven dentro
  // de StickyHeader (sticky + z-index propio), que crea su propio contexto de apilamiento.
  // Sin el portal, un modal abierto desde ahí quedaría anidado en ese contexto y su z-index
  // solo competiría dentro de él — comparado con el resto de la página (p. ej. el FAB, z-30,
  // fuera de ese contexto) quedaría por debajo pese a declarar z-50/z-[60], porque esos
  // valores ya no se comparan contra el resto del documento. Portar al body deja que el
  // z-index se compare siempre al nivel raíz, sea cual sea el componente que abra el modal.
  return createPortal(
    <div
      className={`fixed left-0 right-0 ${overlayBg} ${isLg ? 'z-50' : 'z-[60]'} flex items-end pb-safe ${
        isLg ? 'md:items-stretch md:justify-end md:pb-0' : desktopCentered ? 'md:items-center md:pb-0' : ''
      } justify-center`}
      style={{ top: viewportInset.top, height: viewportInset.height }}
    >
      <div className="absolute inset-0" onClick={onCancel} />
      {isLg && header ? (
        <div className="relative bg-card w-full max-w-2xl max-h-[90%] flex flex-col rounded-t-3xl animate-slide-up sheet-desktop-drawer md:w-1/3 md:max-w-none md:h-full md:max-h-full md:rounded-none md:rounded-l-3xl">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 shrink-0 md:hidden" />
          <div className="shrink-0 px-6 pt-3 pb-4 md:pt-6 flex items-center justify-between border-b border-border">
            {header}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-5 pb-10 space-y-5 md:pb-6">
            {children}
          </div>
        </div>
      ) : isLg ? (
        <div className="relative bg-card w-full max-w-2xl max-h-[90%] overflow-y-auto rounded-t-3xl px-6 pt-6 pb-10 space-y-5 animate-slide-up sheet-desktop-drawer md:w-1/3 md:max-w-none md:h-full md:max-h-full md:rounded-none md:rounded-l-3xl md:pb-6">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-2 md:hidden" />
          {children}
        </div>
      ) : (
        <div
          className={`relative z-10 bg-background w-full max-w-md max-h-[90%] overflow-y-auto rounded-t-2xl ${
            desktopCentered ? 'md:rounded-2xl' : ''
          } p-6 animate-slide-up`}
        >
          {children}
        </div>
      )}
    </div>,
    document.body
  );
}
