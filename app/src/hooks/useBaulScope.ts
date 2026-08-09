import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { loadUserData } from '@/features/auth/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useScopeOutcome } from '@/hooks/useScopeOutcome';
import { loadBaulRecuerdos } from '@/features/memories/useCases';
import { loadChapters } from '@/features/baules/useCases';
import { loadLoosePhotos } from '@/features/photos/useCases';

// Cualquier ruta bajo /baules/:baulId depende de que el baúl, sus capítulos y sus fotos
// sueltas estén en el store. El cambio de baúl desde el selector de workspace no los
// precarga, y un refresco o un deep link aterriza aquí con el store vacío. Este hook
// centraliza la misma lógica de auto-recuperación que ya tenía BaulRoute para que el resto de
// rutas de la cadena (álbum, visor de foto, fotos sueltas) no se queden colgadas en "Cargando...".
// La interpretación de isLoading/refreshFailed/baul (qué renderizar mientras no está listo)
// vive en guardBaulScope (./baulScopeGuard), no en cada caller — ver ese archivo. El propio
// estado de "todavía cargando vs. ya falló" vive en useScopeOutcome, compartido con
// useChapterScope/usePersonaScope.
export function useBaulScope(baulId: string | undefined) {
  const auth = useAuth();
  const { run } = useAsyncAction();
  const { baules, chapters, loosePhotos } = useBaulesStore();
  const { baulRecuerdos } = useRecuerdosStore();

  const baul = baules.find(b => b.id === baulId);
  const hasScope = !!baul && !!baulId && !!chapters[baulId] && !!baulRecuerdos[baulId];

  const { result, setOutcome, reset } = useScopeOutcome(baulId ?? '');

  // Isomorfo a "esta pantalla todavía no tiene nada que enseñar": true mientras el baúl en sí
  // o su alcance (capítulos/recuerdos/fotos sueltas) no estén en el store y no hayamos
  // terminado ya de intentarlo. Al derivarse directamente del store en cada render (en vez de
  // ser un flag que un efecto va actualizando) no hay ningún render intermedio en el que
  // parezca listo sin estarlo del todo.
  const isLoading = !!baulId && auth.isAuthenticated && !hasScope && result === null;
  const refreshFailed = result === 'failed';

  const loadScope = async (id: string) => {
    let currentBaul = useBaulesStore.getState().baules.find(b => b.id === id);
    if (!currentBaul) {
      const loadResult = await run(() => loadUserData(), {
        key: `baul-scope:${id}:refresh`,
        errorMessage: 'No se pudo cargar el baúl. Comprueba tu conexión e inténtalo de nuevo.',
      });
      if (!loadResult.ok) {
        setOutcome(id, 'failed');
        return;
      }
      currentBaul = useBaulesStore.getState().baules.find(b => b.id === id);
      if (!currentBaul) {
        setOutcome(id, 'not-found');
        return;
      }
    }

    const { chapters } = useBaulesStore.getState();
    const { baulRecuerdos } = useRecuerdosStore.getState();
    const needsChapters = !chapters[id];
    const needsRecuerdos = !baulRecuerdos[id];

    if (!needsChapters && !needsRecuerdos) {
      setOutcome(id, null);
      return;
    }

    // Keyed by the baúl being fetched, not a fixed/default key — otherwise switching to a
    // different baúl while this fetch is still in flight would make useAsyncAction dedupe the
    // new baúl's own fetch as "already pending" and silently skip it. See useScopeOutcome for
    // the matching half of this fix (why a stale response can't overwrite the new outcome).
    const loadResult = await run(() => Promise.all([
      ...(needsChapters ? [loadChapters(id), loadLoosePhotos(id)] : []),
      ...(needsRecuerdos ? [loadBaulRecuerdos(id)] : []),
    ]), { key: `baul-scope:${id}:load`, errorMessage: 'Error al cargar los capítulos del baúl' });

    // Resolved explicitly either way — including on success — so a previous failed attempt
    // (surfaced via retry) can't leave refreshFailed stuck true once this one lands.
    setOutcome(id, loadResult.ok ? null : 'failed');
  };

  useEffect(() => {
    if (isLoading) loadScope(baulId!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId, isLoading]);

  return {
    baul,
    chapters: baulId ? chapters[baulId] : undefined,
    loosePhotos: baulId ? loosePhotos[baulId] : undefined,
    baulRecuerdos: baulId ? baulRecuerdos[baulId] : undefined,
    isLoading,
    refreshFailed,
    retry: () => {
      if (!baulId) return;
      reset();
      return loadScope(baulId);
    },
  };
}
