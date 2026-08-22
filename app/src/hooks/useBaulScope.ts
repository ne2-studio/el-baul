import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { api } from '@/api';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { hydratePhotos, usePhotosStore } from '@/store/usePhotosStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { useUIStore } from '@/store/uiStore';
import { loadUserData } from '@/features/auth/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useScopeOutcome } from '@/hooks/useScopeOutcome';
import { getBaulPermissions } from '@/utils/roleUtils';

// Cualquier ruta bajo /baules/:baulId depende de que el baúl, sus capítulos, sus fotos
// sueltas y las personas del baúl estén en el store (y, si el usuario puede revisar
// solicitudes de eliminación, también esas). El cambio de baúl desde el selector de workspace
// no los precarga, y un refresco o deep link aterriza aquí con el store vacío. Este hook
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
  const { baulRecuerdos } = useRecuerdosStore();
  const { personas, removalRequests } = usePersonasStore();

  const baul = baules.find(b => b.id === baulId);
  // canReviewRemovalRequests solo depende de baul.role/isCustodio, ya disponibles en cuanto
  // el propio baúl está en el store — no hace falta esperar a nada más para decidirlo.
  const needsRemovalRequestsScope = getBaulPermissions(baul).canReviewRemovalRequests;
  // Sin gate propio para baulFeed (a diferencia de la versión anterior de este hook): al llegar
  // todo en una única respuesta de api.baules.getScope (ver más abajo), chapters/recuerdos/
  // personas/baulFeed se escriben en el store juntos, en el mismo callback — no hay ningún
  // instante intermedio en el que unos ya estén y baulFeed todavía no, así que no hace falta
  // que hasScope lo espere por separado. Antes sí hacía falta porque baulFeed dependía de un
  // flag (baulFeedEnabled) que llegaba por una petición aparte y podía resolver a mitad de la
  // carga — ver BaulRoute.baulFeedRace.test.tsx y BaulScopeAggregator (api/) para el porqué esa
  // carrera ahora se resuelve una única vez, en el servidor, dentro de esta misma petición.
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

    // Una única petición para todo el scope — ver BaulScopeAggregator (api/) para por qué esto
    // sustituye al Promise.all de 5-6 peticiones sueltas que tenía esta función antes, y por qué
    // eso era necesario (no solo una optimización) para eliminar de raíz la carrera con
    // baulFeedEnabled: al resolverse ese flag también en el servidor, dentro de esta misma
    // petición, no puede quedar "a medias" como sí podía cuando era una llamada aparte en el
    // cliente.
    const scopeResult = await run(
      () => api.baules.getScope(id, options.includeBaulFeed === true),
      { key: `baul-scope:${id}:load`, errorMessage: 'Error al cargar los capítulos del baúl' }
    );

    if (!scopeResult.ok) {
      setOutcome(id, 'failed');
      return;
    }

    const scope = scopeResult.value;
    usePhotosStore.getState().upsertPhotos(scope.loosePhotos);
    useBaulesStore.setState((state) => ({
      chapters: { ...state.chapters, [id]: scope.chapters },
      loosePhotos: { ...state.loosePhotos, [id]: scope.loosePhotos.map((photo) => photo.id) },
    }));
    useRecuerdosStore.setState((state) => ({
      baulRecuerdos: { ...state.baulRecuerdos, [id]: scope.recuerdos },
      // Solo se escribe cuando el servidor de verdad lo incluyó (includeBaulFeed pedido y la
      // feature encendida) — null aquí no distingue entre "no se pidió" y "está apagada", pero
      // el hook no necesita esa distinción: en ambos casos no hay nada que escribir.
      ...(scope.baulFeed && {
        baulFeed: { ...state.baulFeed, [id]: scope.baulFeed.feedItems },
        baulFeedHasMore: { ...state.baulFeedHasMore, [id]: scope.baulFeed.hasMore },
      }),
    }));
    usePersonasStore.setState((state) => ({
      personas: { ...state.personas, [id]: scope.personas },
      // null cuando el usuario no es admin (el servidor lo omite en vez de fallar la petición
      // entera) — needsRemovalRequestsScope ya refleja ese mismo permiso del lado del cliente,
      // así que dejarlo sin escribir aquí es coherente con lo que hasScope va a exigir.
      ...(scope.removalRequests && { removalRequests: { ...state.removalRequests, [id]: scope.removalRequests } }),
    }));

    setOutcome(id, null);
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
