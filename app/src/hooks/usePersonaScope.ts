import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { loadPersonas, loadPersonaPhotos } from '@/features/people/useCases';
import { loadBaulRecuerdos } from '@/features/memories/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';

type ScopeOutcome = 'failed' | 'not-found' | null;

// PersonaDetailRoute y PersonaPhotoViewerRoute dependen de que la persona, sus fotos
// etiquetadas y los recuerdos del baúl (la pestaña Recuerdos de la ficha filtra estos últimos
// por autor) estén en el store. La navegación normal desde BaulRoute ya deja `personas`
// precargado (loadChapters carga personas como efecto colateral — ver features/baules/useCases)
// y normalmente también `baulRecuerdos`, pero un refresco o deep link puede aterrizar aquí con
// el store vacío, y las fotos de la persona nunca se precargan desde BaulRoute. Este hook
// centraliza esa carga — bloqueando hasta tener las tres piezas — para que ninguna de las dos
// rutas tenga que duplicarla ni mostrar un hueco de carga al cambiar de tab. Mismo patrón que
// useBaulScope, a nivel de persona en vez de a nivel de baúl — incluida la misma corrección:
// isLoading se deriva del store en cada render en vez de ser un flag actualizado por un
// efecto, porque PersonaDetailRoute no se desmonta al cambiar de personaId (mismo componente,
// solo cambia el param) y un flag así siempre llegaría un frame tarde, dejando ver un instante
// la ficha anterior (o un hueco vacío) aplicado a la nueva.
export function usePersonaScope(baulId: string | undefined, personaId: string | undefined) {
  const auth = useAuth();
  const { run } = useAsyncAction();
  const { personas, personaPhotos } = usePersonasStore();
  const { baulRecuerdos } = useRecuerdosStore();

  const persona = (baulId ? personas[baulId] : undefined)?.find((p) => p.id === personaId);
  const hasScope = !!persona && !!personaId && !!personaPhotos[personaId] && !!(baulId && baulRecuerdos[baulId]);

  const key = `${baulId ?? ''}:${personaId ?? ''}`;
  const [outcome, setOutcome] = useState<{ key: string; result: ScopeOutcome }>({ key, result: null });
  const result = outcome.key === key ? outcome.result : null;
  if (outcome.key !== key) {
    setOutcome({ key, result: null });
  }

  const isLoading = !!baulId && !!personaId && auth.isAuthenticated && !hasScope && result === null;
  const loadFailed = result === 'failed';

  const load = async () => {
    if (!baulId || !personaId) return;

    const { personas, personaPhotos } = usePersonasStore.getState();
    const { baulRecuerdos } = useRecuerdosStore.getState();
    const needsPersonas = !personas[baulId];
    const needsPhotos = !personaPhotos[personaId];
    const needsRecuerdos = !baulRecuerdos[baulId];
    if (!needsPersonas && !needsPhotos && !needsRecuerdos) return;

    const loadResult = await run(() => Promise.all([
      ...(needsPersonas ? [loadPersonas(baulId)] : []),
      ...(needsPhotos ? [loadPersonaPhotos(baulId, personaId)] : []),
      ...(needsRecuerdos ? [loadBaulRecuerdos(baulId)] : []),
    ]), { errorMessage: 'Error al cargar la ficha' });

    if (!loadResult.ok) {
      setOutcome({ key, result: 'failed' });
      return;
    }
    const { personas: refreshedPersonas, personaPhotos: refreshedPhotos } = usePersonasStore.getState();
    const found = refreshedPersonas[baulId]?.find((p) => p.id === personaId);
    if (!found || !refreshedPhotos[personaId]) {
      setOutcome({ key, result: 'not-found' });
    }
    // Si se encontró todo, no hace falta un outcome de éxito explícito: hasScope pasa a true
    // en cuanto los stores se actualizan, y de ahí sale isLoading=false por sí solo.
  };

  useEffect(() => {
    if (isLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId, personaId, isLoading]);

  return {
    persona,
    photos: personaId ? personaPhotos[personaId] : undefined,
    isLoading,
    loadFailed,
    retry: () => {
      setOutcome({ key, result: null });
      return load();
    },
  };
}
