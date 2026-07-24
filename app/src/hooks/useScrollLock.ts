import { useEffect } from 'react';

/**
 * Bloquea el scroll del body mientras el componente que la usa está montado —
 * el visor de fotos y otros overlays de página completa no usan un dialog
 * nativo ni un portal, así que sin esto el fondo se desplaza detrás del overlay.
 */
export function useScrollLock() {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
}
