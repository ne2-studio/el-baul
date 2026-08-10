import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { usePersonasStore } from '@/store/usePersonasStore';
import { hydratePhotos, usePhotosStore } from '@/store/usePhotosStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { loadPersonas, loadPersonaPhotos } from '@/features/people/useCases';
import { loadBaulRecuerdos } from '@/features/memories/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useScopeOutcome } from '@/hooks/useScopeOutcome';

// PersonaDetailRoute y PersonaPhotoViewerRoute dependen de que la persona, sus fotos
// etiquetadas y los recuerdos del baúl (la pestaña Recuerdos de la ficha filtra estos últimos
// por autor) estén en el store. La navegación normal desde BaulRoute ya deja `personas`
// precargado (loadChapters carga personas como efecto colateral — ver features/baules/useCases)
// y normalmente también `baulRecuerdos`, pero un refresco o deep link puede aterrizar aquí con
// el store vacío, y las fotos de la persona nunca se precargan desde BaulRoute. Este hook
// centraliza esa carga — bloqueando hasta tener las tres piezas — para que ninguna de las dos
// rutas tenga que duplicarla ni mostrar un hueco de carga al cambiar de tab. Mismo patrón que
// useBaulScope/useChapterScope, a nivel de persona — incluida la misma máquina de estados
// (useScopeOutcome): isLoading se deriva del store en cada render en vez de ser un flag
// actualizado por un efecto, porque PersonaDetailRoute no se desmonta al cambiar de personaId
// (mismo componente, solo cambia el param) y un flag así siempre llegaría un frame tarde,
// dejando ver un instante la ficha anterior (o un hueco vacío) aplicado a la nueva.
export function usePersonaScope(baulId: string | undefined, personaId: string | undefined) {
  const auth = useAuth();
  const { run } = useAsyncAction();
  const { personas, personaPhotos } = usePersonasStore();
  const photosById = usePhotosStore((state) => state.photosById);
  const { baulRecuerdos } = useRecuerdosStore();

  const persona = (baulId ? personas[baulId] : undefined)?.find((p) => p.id === personaId);
  const hasScope = !!persona && !!personaId && !!personaPhotos[personaId] && !!(baulId && baulRecuerdos[baulId]);

  const { result, setOutcome, reset } = useScopeOutcome(`${baulId ?? ''}:${personaId ?? ''}`);

  const isLoading = !!baulId && !!personaId && auth.isAuthenticated && !hasScope && result === null;
  const loadFailed = result === 'failed';

  const load = async (forBaulId: string, forPersonaId: string) => {
    const { personas, personaPhotos } = usePersonasStore.getState();
    const { baulRecuerdos } = useRecuerdosStore.getState();
    const needsPersonas = !personas[forBaulId];
    const needsPhotos = !personaPhotos[forPersonaId];
    const needsRecuerdos = !baulRecuerdos[forBaulId];
    if (!needsPersonas && !needsPhotos && !needsRecuerdos) {
      setOutcome(`${forBaulId}:${forPersonaId}`, null);
      return;
    }

    // Keyed by the persona being fetched, not a fixed/default key — otherwise navigating to a
    // different persona while this fetch is still in flight would make useAsyncAction dedupe
    // the new persona's own fetch as "already pending" and silently skip it. See
    // useScopeOutcome for the matching half of this fix (why a stale response can't overwrite
    // the new outcome).
    const loadResult = await run(() => Promise.all([
      ...(needsPersonas ? [loadPersonas(forBaulId)] : []),
      ...(needsPhotos ? [loadPersonaPhotos(forBaulId, forPersonaId)] : []),
      ...(needsRecuerdos ? [loadBaulRecuerdos(forBaulId)] : []),
    ]), { key: `persona-scope:${forBaulId}:${forPersonaId}`, errorMessage: 'Error al cargar la ficha' });

    if (!loadResult.ok) {
      setOutcome(`${forBaulId}:${forPersonaId}`, 'failed');
      return;
    }

    // Resolved explicitly either way — including on success — so a previous failed attempt
    // (surfaced via retry) can't leave loadFailed stuck true once this one lands.
    const { personas: refreshedPersonas, personaPhotos: refreshedPhotos } = usePersonasStore.getState();
    const found = refreshedPersonas[forBaulId]?.find((p) => p.id === forPersonaId);
    setOutcome(`${forBaulId}:${forPersonaId}`, (!found || !refreshedPhotos[forPersonaId]) ? 'not-found' : null);
  };

  useEffect(() => {
    if (isLoading) load(baulId!, personaId!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId, personaId, isLoading]);

  return {
    persona,
    photos: personaId ? hydratePhotos(personaPhotos[personaId], photosById) : undefined,
    isLoading,
    loadFailed,
    retry: () => {
      if (!baulId || !personaId) return;
      reset();
      return load(baulId, personaId);
    },
  };
}
