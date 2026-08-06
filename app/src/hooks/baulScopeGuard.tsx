import { ErrorScreen } from '@/design-system/components/feedback/ErrorScreen';
import { Baul } from '@/types';

interface BaulScope {
  baul: Baul | undefined;
  isLoading: boolean;
  refreshFailed: boolean;
  retry: () => void;
}

interface BaulScopeGuardOptions {
  // Cada Route bajo /baules/:baulId muestra su propia copia mientras espera — "Cargando..."
  // para pantallas de baúl/capítulo, "Cargando foto..." para los visores.
  loadingLabel?: string;
  // isLoading de useBaulScope cubre dos cosas distintas: "aún no sabemos si el baúl existe" y
  // "el baúl ya existe, pero sus capítulos/recuerdos/fotos sueltas todavía se están cargando".
  // Los callers que necesitan resolver una entidad concreta dentro del baúl antes de poder
  // renderizar nada (capítulo, foto) sí necesitan esperar a lo segundo — default true. BaulRoute
  // no: sus pestañas ya leen `chapters[baulId] || []` etc. y toleran datos parciales, así que
  // bloquear el chrome entero (header + tabbar) mientras llegan solo produce un parpadeo al
  // cambiar a un baúl que aún no se había abierto esta sesión — pasa `false` para evitarlo.
  requireFullScope?: boolean;
}

export type BaulScopeGuardResult =
  | { ready: true; baul: Baul }
  // screen es lo que hay que renderizar mientras el baúl no está listo (cargando, error de
  // refresco, o no encontrado) — el caller hace `if (!guard.ready) return guard.screen;`.
  | { ready: false; screen: React.ReactNode };

// Interpreta el contrato de useBaulScope (isLoading / refreshFailed / baul) del mismo modo en
// las cuatro rutas que dependen de él, para que ninguna reimplemente el guard de
// carga/error/no-encontrado a mano. Devuelve `{ ready: true, baul }` con `baul` ya estrechado
// a no-undefined cuando está listo, para que el caller pueda usarlo sin re-comprobar — un
// simple `React.ReactNode | null` no permite ese estrechamiento a través de la llamada.
export function guardBaulScope(
  { baul, isLoading, refreshFailed, retry }: BaulScope,
  { loadingLabel = 'Cargando...', requireFullScope = true }: BaulScopeGuardOptions = {},
): BaulScopeGuardResult {
  if (isLoading && (requireFullScope || !baul)) {
    return { ready: false, screen: <div className="p-8 text-center">{loadingLabel}</div> };
  }

  if (!baul) {
    if (refreshFailed) {
      return {
        ready: false,
        screen: (
          <ErrorScreen
            title="No se ha podido cargar el baúl"
            message="Comprueba tu conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={retry}
          />
        ),
      };
    }
    return { ready: false, screen: <div className="p-8 text-center">No se ha encontrado el baúl.</div> };
  }

  return { ready: true, baul };
}
