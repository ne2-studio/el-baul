import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { loadUserData } from '@/features/auth/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { loadBaulRecuerdos } from '@/features/memories/useCases';
import { loadChapters } from '@/features/baules/useCases';
import { loadLoosePhotos } from '@/features/photos/useCases';

type ScopeOutcome = 'failed' | 'not-found' | null;

// Cualquier ruta bajo /baules/:baulId depende de que el baúl, sus capítulos y sus fotos
// sueltas estén en el store. El cambio de baúl desde el selector de workspace no los
// precarga, y un refresco o un deep link aterriza aquí con el store vacío. Este hook
// centraliza la misma lógica de auto-recuperación que ya tenía BaulRoute para que el resto de
// rutas de la cadena (álbum, visor de foto, fotos sueltas) no se queden colgadas en "Cargando...".
// La interpretación de isLoading/refreshFailed/baul (qué renderizar mientras no está listo)
// vive en guardBaulScope (./baulScopeGuard), no en cada caller — ver ese archivo.
export function useBaulScope(baulId: string | undefined) {
  const auth = useAuth();
  const { run } = useAsyncAction();
  const { baules, chapters, loosePhotos } = useBaulesStore();
  const { baulRecuerdos } = useRecuerdosStore();

  const baul = baules.find(b => b.id === baulId);
  const hasScope = !!baul && !!baulId && !!chapters[baulId] && !!baulRecuerdos[baulId];

  // outcome solo importa mientras hasScope es false, para distinguir "todavía cargando" (null)
  // de "ya lo hemos intentado y no ha ido bien" (failed/not-found). Se resetea en el propio
  // render —no en un efecto— en cuanto cambia baulId: BaulRoute no se desmonta al cambiar de
  // baúl (mismo componente, solo cambia el param), así que un efecto siempre llegaría un frame
  // tarde y dejaría ver, aunque fuera un instante, el resultado del baúl anterior aplicado al
  // nuevo. Este es el patrón que React documenta para "ajustar estado cuando cambia una prop"
  // sin ese hueco.
  const [outcome, setOutcome] = useState<{ baulId: string | undefined; result: ScopeOutcome }>({
    baulId,
    result: null,
  });
  const result = outcome.baulId === baulId ? outcome.result : null;
  if (outcome.baulId !== baulId) {
    setOutcome({ baulId, result: null });
  }

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
        key: 'refresh-baul',
        errorMessage: 'No se pudo cargar el baúl. Comprueba tu conexión e inténtalo de nuevo.',
      });
      if (!loadResult.ok) {
        setOutcome({ baulId: id, result: 'failed' });
        return;
      }
      currentBaul = useBaulesStore.getState().baules.find(b => b.id === id);
      if (!currentBaul) {
        setOutcome({ baulId: id, result: 'not-found' });
        return;
      }
    }

    const { chapters } = useBaulesStore.getState();
    const { baulRecuerdos } = useRecuerdosStore.getState();
    const needsChapters = !chapters[id];
    const needsRecuerdos = !baulRecuerdos[id];

    if (needsChapters || needsRecuerdos) {
      await run(() => Promise.all([
        ...(needsChapters ? [loadChapters(id), loadLoosePhotos(id)] : []),
        ...(needsRecuerdos ? [loadBaulRecuerdos(id)] : []),
      ]), {
        errorMessage: 'Error al cargar los capítulos del baúl',
      });
    }
    // Sin outcome de éxito explícito: hasScope pasa a true en cuanto los stores se actualizan,
    // y de ahí sale isLoading=false por sí solo.
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
    retry: () => { if (baulId) setOutcome({ baulId, result: null }); },
  };
}
