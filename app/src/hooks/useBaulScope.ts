import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { hydratePhotos, usePhotosStore } from '@/store/usePhotosStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { loadUserData } from '@/features/auth/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useScopeOutcome } from '@/hooks/useScopeOutcome';
import { loadBaulRecuerdos } from '@/features/memories/useCases';
import { loadChapters } from '@/features/baules/useCases';
import { loadLoosePhotos, loadRemovalRequests } from '@/features/photos/useCases';
import { loadPersonas } from '@/features/people/useCases';
import { getBaulPermissions } from '@/utils/roleUtils';

// Cualquier ruta bajo /baules/:baulId depende de que el baúl, sus capítulos, sus fotos
// sueltas y las personas del baúl estén en el store (y, si el usuario puede revisar
// solicitudes de eliminación, también esas). El cambio de baúl desde el selector de workspace
// no los precarga, y un refresco o un deep link aterriza aquí con el store vacío. Este hook
// centraliza la misma lógica de auto-recuperación que ya tenía BaulRoute para que el resto de
// rutas de la cadena (capítulo, visor de foto, fotos sueltas, subida en lote, solicitudes de
// eliminación) no se queden colgadas en "Cargando..." ni tengan que duplicar su propio efecto
// de carga de personas — todas comparten este único punto de entrada.
// La interpretación de isLoading/refreshFailed/baul (qué renderizar mientras no está listo)
// vive en guardBaulScope (./baulScopeGuard), no en cada caller — ver ese archivo. El propio
// estado de "todavía cargando vs. ya falló" vive en useScopeOutcome, compartido con
// useChapterScope/usePersonaScope.
export function useBaulScope(baulId: string | undefined) {
  const auth = useAuth();
  const { run } = useAsyncAction();
  const { baules, chapters, loosePhotos } = useBaulesStore();
  const photosById = usePhotosStore((state) => state.photosById);
  const { baulRecuerdos } = useRecuerdosStore();
  const { personas, removalRequests } = usePersonasStore();

  const baul = baules.find(b => b.id === baulId);
  // canReviewRemovalRequests solo depende de baul.role/isCustodio, ya disponibles en cuanto
  // el propio baúl está en el store — no hace falta esperar a nada más para decidirlo.
  const needsRemovalRequestsScope = getBaulPermissions(baul).canReviewRemovalRequests;
  const hasScope = !!baul && !!baulId && !!chapters[baulId] && !!baulRecuerdos[baulId]
    && !!personas[baulId] && (!needsRemovalRequestsScope || !!removalRequests[baulId]);

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
    const { personas, removalRequests } = usePersonasStore.getState();
    const needsChapters = !chapters[id];
    const needsRecuerdos = !baulRecuerdos[id];
    const needsPersonas = !personas[id];
    const needsRemovalRequests = getBaulPermissions(currentBaul).canReviewRemovalRequests && !removalRequests[id];

    if (!needsChapters && !needsRecuerdos && !needsPersonas && !needsRemovalRequests) {
      setOutcome(id, null);
      return;
    }

    // Keyed by the baúl being fetched, not a fixed/default key — otherwise switching to a
    // different baúl while this fetch is still in flight would make useAsyncAction dedupe the
    // new baúl's own fetch as "already pending" and silently skip it. See useScopeOutcome for
    // the matching half of this fix (why a stale response can't overwrite the new outcome).
    // Ninguna de estas peticiones depende del resultado de otra (personas/removalRequests no
    // necesitan los capítulos, solo baulId y el rol del baúl ya resuelto arriba), así que van
    // todas en el mismo Promise.all en vez de encadenarse.
    const loadResult = await run(() => Promise.all([
      ...(needsChapters ? [loadChapters(id), loadLoosePhotos(id)] : []),
      ...(needsRecuerdos ? [loadBaulRecuerdos(id)] : []),
      ...(needsPersonas ? [loadPersonas(id)] : []),
      ...(needsRemovalRequests ? [loadRemovalRequests(id)] : []),
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
    loosePhotos: baulId ? hydratePhotos(loosePhotos[baulId], photosById) : undefined,
    baulRecuerdos: baulId ? baulRecuerdos[baulId] : undefined,
    personas: baulId ? personas[baulId] : undefined,
    removalRequests: baulId ? removalRequests[baulId] : undefined,
    isLoading,
    refreshFailed,
    retry: () => {
      if (!baulId) return;
      reset();
      return loadScope(baulId);
    },
  };
}
