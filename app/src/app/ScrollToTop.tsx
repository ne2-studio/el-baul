import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getBackgroundLocation } from '@/features/photos/viewerNavigation';

// React Router doesn't reset scroll on navigation (unlike full page loads), so without
// this every route mounts wherever the previous page happened to be scrolled to.
export function ScrollToTop() {
  const location = useLocation();

  // El visor de foto se abre como overlay sobre la pantalla de fondo (ver
  // features/photos/viewerNavigation): esa pantalla nunca se desmonta, así que resetear el
  // scroll en ese caso borraría la posición que se supone hay que conservar al cerrar el
  // visor. Solo importa el pathname "efectivo" (el de fondo si lo hay).
  const backgroundLocation = getBackgroundLocation(location);
  const effectivePathname = backgroundLocation?.pathname ?? location.pathname;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [effectivePathname]);

  return null;
}
