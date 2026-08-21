import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { hydratePhotos, usePhotosStore } from '@/store/usePhotosStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useUIStore } from '@/store/uiStore';
import { loadUserData } from '@/features/auth/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useScopeOutcome } from '@/hooks/useScopeOutcome';
import { loadBaulFeed, loadBaulRecuerdos } from '@/features/memories/useCases';
import { loadChapters } from '@/features/baules/useCases';
import { loadLoosePhotos } from '@/features/photos/useCases';
import { loadRemovalRequests } from '@/features/moderation/useCases';
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
interface UseBaulScopeOptions {
  includeBaulFeed?: boolean;
}

export function useBaulScope(baulId: string | undefined, options: UseBaulScopeOptions = {}) {
  const auth = useAuth();
  const { run } = useAsyncAction();
  const { baules, chapters, loosePhotos } = useBaulesStore();
  const photosById = usePhotosStore((state) => state.photosById);
  const { baulRecuerdos, baulFeed } = useRecuerdosStore();
  const baulFeedEnabled = useAppConfigStore((state) => state.baulFeedEnabled);
  const { personas, removalRequests } = usePersonasStore();

  const baul = baules.find(b => b.id === baulId);
  // canReviewRemovalRequests solo depende de baul.role/isCustodio, ya disponibles en cuanto
  // el propio baúl está en el store — no hace falta esperar a nada más para decidirlo.
  const needsRemovalRequestsScope = getBaulPermissions(baul).canReviewRemovalRequests;
  const needsBaulFeedScope = options.includeBaulFeed === true && baulFeedEnabled;
  const hasHistoryScope = !!(baulId && baulRecuerdos[baulId]) && (!needsBaulFeedScope || !!baulFeed[baulId]);
  const hasScope = !!baul && !!baulId && !!chapters[baulId] && hasHistoryScope
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

    // Bucle en vez de una única pasada: app-config (de donde sale baulFeedEnabled) es una
    // llamada suelta que corre en paralelo a esta, así que puede resolver mientras el
    // Promise.all de abajo todavía está en vuelo. needsBaulFeedScope, calculado en el cuerpo
    // del hook, queda cerrado sobre el render que lanzó ESTA llamada — si el flag cambia a
    // mitad de carga, esa versión ya capturada no se entera. Releer baulFeedEnabled en fresco
    // aquí dentro (como ya se hace con chapters/personas/etc.) no basta por sí solo porque la
    // única lectura sigue siendo antes del Promise.all; el bucle es lo que de verdad lo
    // resuelve, repitiendo la comprobación después de cada tanda por si algo empezó a hacer
    // falta mientras esa tanda estaba en curso. Sin esto, isLoading se queda en `true` sin que
    // el efecto de abajo lo detecte nunca (nunca pasa por `false` de por medio) y la persona se
    // queda en "Abriendo baúl..." para siempre — ver BaulRoute.baulFeedRace.test.tsx.
    //
    // `attempted` acota el bucle: solo se repite si aparece un trozo del scope que no se había
    // pedido todavía (a lo sumo uno por cada pieza — chapters/recuerdos/baulFeed/personas/
    // removalRequests — así que 5 vueltas es el máximo posible). Si algo sigue sin estar en el
    // store después de haberlo pedido ya una vez (una respuesta que "tuvo éxito" pero no dejó
    // lo esperado), no se reintenta en bucle infinito — se acepta como antes, en vez de colgar
    // la pantalla o consumir memoria sin parar.
    const attempted = new Set<string>();
    for (;;) {
      const { chapters } = useBaulesStore.getState();
      const { baulRecuerdos, baulFeed } = useRecuerdosStore.getState();
      const { personas, removalRequests } = usePersonasStore.getState();
      const needsBaulFeedNow = options.includeBaulFeed === true && useAppConfigStore.getState().baulFeedEnabled;
      const needs = {
        chapters: !chapters[id],
        recuerdos: !baulRecuerdos[id],
        baulFeed: needsBaulFeedNow && !baulFeed[id],
        personas: !personas[id],
        removalRequests: getBaulPermissions(currentBaul).canReviewRemovalRequests && !removalRequests[id],
      };
      const currentNeeds = Object.entries(needs).filter(([, needed]) => needed).map(([key]) => key);

      if (currentNeeds.length === 0) {
        setOutcome(id, null);
        return;
      }
      if (currentNeeds.every((need) => attempted.has(need))) {
        setOutcome(id, null);
        return;
      }
      currentNeeds.forEach((need) => attempted.add(need));

      // Keyed by the baúl being fetched, not a fixed/default key — otherwise switching to a
      // different baúl while this fetch is still in flight would make useAsyncAction dedupe the
      // new baúl's own fetch as "already pending" and silently skip it. See useScopeOutcome for
      // the matching half of this fix (why a stale response can't overwrite the new outcome).
      // Ninguna de estas peticiones depende del resultado de otra (personas/removalRequests no
      // necesitan los capítulos, solo baulId y el rol del baúl ya resuelto arriba), así que van
      // todas en el mismo Promise.all en vez de encadenarse.
      const loadResult = await run(() => Promise.all([
        ...(needs.chapters ? [loadChapters(id), loadLoosePhotos(id)] : []),
        ...(needs.recuerdos ? [loadBaulRecuerdos(id)] : []),
        ...(needs.baulFeed ? [loadBaulFeed(id)] : []),
        ...(needs.personas ? [loadPersonas(id)] : []),
        ...(needs.removalRequests ? [loadRemovalRequests(id)] : []),
      ]), { key: `baul-scope:${id}:load`, errorMessage: 'Error al cargar los capítulos del baúl' });

      if (!loadResult.ok) {
        setOutcome(id, 'failed');
        return;
      }
      // Vuelta a comprobar qué falta ahora que el store se ha asentado, en vez de asumir que
      // esta tanda ha cubierto todo lo que hacía falta.
    }
  };

  useEffect(() => {
    if (isLoading) loadScope(baulId!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId, isLoading]);

  // "Entrar" a un baúl —sea por el selector de workspace, un deep link o una recarga— cuenta
  // como haberlo visto: apaga su dot de novedades (ver hasUnseenBaulActivity en uiStore) para
  // esta persona en este dispositivo. Se dispara en cuanto el baúl está resuelto (no hace falta
  // esperar al resto del scope), keyed por baul.updatedAt además de su id para que una
  // actualización posterior mientras la persona sigue dentro del mismo baúl también se marque
  // como vista sin necesidad de salir y volver a entrar.
  useEffect(() => {
    if (!baul) return;
    useUIStore.getState().markBaulActivitySeen(baul.id, baul.updatedAt);
  }, [baul?.id, baul?.updatedAt]);

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
