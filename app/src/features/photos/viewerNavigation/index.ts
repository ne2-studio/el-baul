import type { Location, NavigateFunction } from 'react-router-dom';

// El visor de foto se abre como overlay cuando hay una pantalla de origen que preservar
// (location.state.backgroundLocation): el árbol de rutas principal sigue renderizando esa
// pantalla de fondo y un segundo <Routes> pinta el visor encima (ver
// features/photos/viewerNavigation/routes.tsx y App.tsx). Sin backgroundLocation (deep link,
// refresco, enlace compartido) el visor se trata como cualquier otra ruta a pantalla completa.
export function getBackgroundLocation(location: Location): Location | undefined {
  return (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;
}

export function photoViewerPath(basePath: string, photoId: string): string {
  return `${basePath}/foto/${photoId}`;
}

export function openPhotoViewer(navigate: NavigateFunction, location: Location, path: string): void {
  navigate(path, { state: { backgroundLocation: location } });
}

// Un back de navegador vuelve exactamente a la pantalla de fondo en su mismo scroll; sin
// backgroundLocation (enlace directo) no hay nada a lo que volver, así que se navega
// explícitamente a fallbackPath.
export function closePhotoViewer(
  navigate: NavigateFunction,
  backgroundLocation: Location | undefined,
  fallbackPath: string
): void {
  if (backgroundLocation) navigate(-1);
  else navigate(fallbackPath, { replace: true });
}

export function navigateToPhotoInViewer(
  navigate: NavigateFunction,
  backgroundLocation: Location | undefined,
  path: string
): void {
  navigate(path, {
    replace: true,
    state: backgroundLocation ? { backgroundLocation } : undefined,
  });
}
