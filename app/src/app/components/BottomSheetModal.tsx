import React from 'react';

interface BottomSheetModalProps {
  onCancel: () => void;
  children: React.ReactNode;
  /**
   * 'sm': hoja de confirmación/acción — rounded-t-2xl, max-w-md, p-6, fondo bg-background,
   * por encima de todo lo demás incluido el visor de fotos (z-[60]). Es el valor por defecto.
   * 'lg': hoja de formulario — rounded-t-3xl, max-w-2xl, más padding, fondo bg-card, con el
   * "handle" (barrita) arriba, z-50.
   */
  size?: 'sm' | 'lg';
  /** Solo aplica con size='sm': en escritorio (md+) pasa a diálogo centrado en vez de
   * quedarse pegada abajo. Ninguna hoja 'lg' lo hace hoy. */
  desktopCentered?: boolean;
  /** Opacidad del backdrop sobre bg-foreground — solo se usa con size='sm'; 'lg' usa
   * bg-black/50 fijo, igual que hasta ahora. */
  backdropOpacity?: 40 | 50 | 60;
}

// Contenedor compartido por todas las hojas ("bottom sheets") que se abren desde abajo de
// la pantalla: fondo + hoja deslizante con las esquinas superiores redondeadas, a todo el
// ancho en móvil. Antes cada modal reimplementaba este shell por su cuenta, y bastaba con
// que uno metiera un padding de más en el contenedor exterior (en vez de dejar que la hoja
// ocupe el ancho completo) para que se viera con "bordes" en vez de a pantalla completa —
// pasó con DeleteAlbumModal. Los modales concretos solo aportan su contenido.
export function BottomSheetModal({
  onCancel,
  children,
  size = 'sm',
  desktopCentered = false,
  backdropOpacity = 50,
}: BottomSheetModalProps) {
  const isLg = size === 'lg';

  const overlayBg = isLg
    ? 'bg-black/50'
    : backdropOpacity === 40 ? 'bg-foreground/40'
    : backdropOpacity === 60 ? 'bg-foreground/60'
    : 'bg-foreground/50';

  return (
    <div
      className={`fixed inset-0 ${overlayBg} ${isLg ? 'z-50' : 'z-[60]'} flex items-end ${
        desktopCentered ? 'md:items-center' : ''
      } justify-center`}
    >
      <div className="absolute inset-0" onClick={onCancel} />
      {isLg ? (
        <div className="relative bg-card w-full max-w-2xl rounded-t-3xl px-6 pt-6 pb-10 space-y-5 animate-slide-up">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-2" />
          {children}
        </div>
      ) : (
        <div
          className={`relative z-10 bg-background w-full max-w-md rounded-t-2xl ${
            desktopCentered ? 'md:rounded-2xl' : ''
          } p-6 animate-slide-up`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
