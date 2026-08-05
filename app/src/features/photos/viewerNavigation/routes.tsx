import { ProtectedRoute } from '@/app/routes/AuthGuards';
import { ChapterPhotoViewerRoute } from '@/features/photos/routes/ChapterPhotoViewerRoute';
import { PersonaPhotoViewerRoute } from '@/features/photos/routes/PersonaPhotoViewerRoute';

// Única fuente de las rutas del visor de foto: App.tsx las pinta dos veces con exactamente el
// mismo path (árbol principal a pantalla completa y overlay sobre backgroundLocation), así que
// deben coincidir o el overlay no encontraría match. Ver features/photos/viewerNavigation.
export const photoViewerRoutes = [
  {
    path: '/baules/:baulId/capitulos/:chapterId/foto/:photoId',
    element: <ProtectedRoute><ChapterPhotoViewerRoute /></ProtectedRoute>,
  },
  {
    path: '/baules/:baulId/fotos-sueltas/foto/:photoId',
    element: <ProtectedRoute><ChapterPhotoViewerRoute /></ProtectedRoute>,
  },
  {
    path: '/baules/:baulId/personas/:personaId/foto/:photoId',
    element: <ProtectedRoute><PersonaPhotoViewerRoute /></ProtectedRoute>,
  },
] as const;
