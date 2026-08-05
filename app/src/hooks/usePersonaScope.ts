import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { usePersonasStore } from '@/store/usePersonasStore';
import { loadPersonas, loadPersonaPhotos } from '@/features/people/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';

// PersonaDetailRoute y PersonaPhotoViewerRoute dependen de que la persona y sus fotos
// etiquetadas estén en el store. La navegación normal desde BaulRoute ya deja `personas`
// precargado (loadChapters carga personas como efecto colateral — ver features/baules/useCases),
// pero un refresco o deep link puede aterrizar aquí con el store vacío, y las fotos de la
// persona nunca se precargan desde BaulRoute. Este hook centraliza esa carga — bloqueando
// hasta tener ambas piezas — para que ninguna de las dos rutas tenga que duplicarla ni
// mostrar un hueco de carga al cambiar de tab. Mismo patrón que useBaulScope, a nivel de
// persona en vez de a nivel de baúl.
export function usePersonaScope(baulId: string | undefined, personaId: string | undefined) {
  const auth = useAuth();
  const { run } = useAsyncAction();
  const { personas, personaPhotos } = usePersonasStore();

  const [isLoading, setIsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const persona = (baulId ? personas[baulId] : undefined)?.find((p) => p.id === personaId);

  const load = async () => {
    if (!baulId || !personaId) return;

    const { personas, personaPhotos } = usePersonasStore.getState();
    const needsPersonas = !personas[baulId];
    const needsPhotos = !personaPhotos[personaId];
    if (!needsPersonas && !needsPhotos) return;

    setIsLoading(true);
    const result = await run(() => Promise.all([
      ...(needsPersonas ? [loadPersonas(baulId)] : []),
      ...(needsPhotos ? [loadPersonaPhotos(baulId, personaId)] : []),
    ]), { errorMessage: 'Error al cargar la ficha' });
    setLoadFailed(!result.ok);
    setIsLoading(false);
  };

  useEffect(() => {
    if (auth.isAuthenticated) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId, personaId, auth.isAuthenticated, loadPersonas, loadPersonaPhotos]);

  return {
    persona,
    photos: personaId ? personaPhotos[personaId] : undefined,
    isLoading,
    loadFailed,
    retry: load,
  };
}
