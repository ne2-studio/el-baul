import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// React Router doesn't reset scroll on navigation (unlike full page loads), so without
// this every route mounts wherever the previous page happened to be scrolled to.
export function ScrollToTop() {
  const location = useLocation();

  // El visor de foto navega con location.state.backgroundLocation cuando se abre como
  // overlay sobre la pantalla actual (ver App.tsx): la pantalla de fondo nunca se desmonta,
  // así que resetear el scroll en ese caso borraría la posición que se supone hay que
  // conservar al cerrar el visor. Solo importa el pathname "efectivo" (el de fondo si lo hay).
  const backgroundLocation = (location.state as { backgroundLocation?: typeof location } | null)?.backgroundLocation;
  const effectivePathname = backgroundLocation?.pathname ?? location.pathname;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [effectivePathname]);

  return null;
}
