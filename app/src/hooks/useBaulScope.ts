import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useAppStore } from '@/store/useAppStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';

// Cualquier ruta bajo /baules/:baulId depende de que el baúl, sus capítulos y sus fotos
// sueltas estén en el store. La navegación normal (BaulesListRoute -> BaulRoute) ya los deja
// precargados, pero un refresco o un deep link aterriza aquí con el store vacío. Este hook
// centraliza la misma lógica de auto-recuperación que ya tenía BaulRoute para que el resto de
// rutas de la cadena (álbum, visor de foto, fotos sueltas) no se queden colgadas en "Cargando...".
export function useBaulScope(baulId: string | undefined) {
  const auth = useAuth();
  const { run } = useAsyncAction();
  const { baules, albums, loosePhotos, baulRecuerdos, fetchData, loadAlbums, loadLoosePhotos, loadBaulRecuerdos } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);

  const baul = baules.find(b => b.id === baulId);

  const attemptRefresh = async () => {
    setIsLoading(true);
    const result = await run(() => fetchData(), {
      key: 'refresh-baul',
      errorMessage: 'No se pudo cargar el baúl. Comprueba tu conexión e inténtalo de nuevo.',
    });
    setRefreshFailed(!result.ok);
    setIsLoading(false);
  };

  useEffect(() => {
    async function initBaul() {
      if (!baulId || !auth.isAuthenticated) return;

      // Si el baúl no está en la lista de baúles, intentamos recargar los datos del usuario
      if (!baul) {
        await attemptRefresh();
        return; // El siguiente renderizado tendrá el baúl (si existe) y se ejecutará el siguiente if
      }

      // Leídos vía getState() (no reactivos) a propósito: ver BaulRoute para el porqué.
      const { albums, baulRecuerdos } = useAppStore.getState();
      const needsAlbums = !albums[baulId];
      const needsRecuerdos = !baulRecuerdos[baulId];

      if (needsAlbums || needsRecuerdos) {
        setIsLoading(true);
        await run(() => Promise.all([
          ...(needsAlbums ? [loadAlbums(baulId), loadLoosePhotos(baulId)] : []),
          ...(needsRecuerdos ? [loadBaulRecuerdos(baulId)] : []),
        ]), {
          errorMessage: 'Error al cargar los capítulos del baúl',
        });
        setIsLoading(false);
      }
    }

    initBaul();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baulId, auth.isAuthenticated, baul, loadAlbums, loadLoosePhotos, loadBaulRecuerdos, fetchData]);

  return {
    baul,
    albums: baulId ? albums[baulId] : undefined,
    loosePhotos: baulId ? loosePhotos[baulId] : undefined,
    baulRecuerdos: baulId ? baulRecuerdos[baulId] : undefined,
    isLoading,
    refreshFailed,
    retry: attemptRefresh,
  };
}
