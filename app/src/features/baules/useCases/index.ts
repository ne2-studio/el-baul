import { PhotoCrop, api } from '@/api';
import { Baul } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useCurrentBaulStore } from '@/store/useCurrentBaulStore';
import { applyCoverUpdate } from '@/store/baulesCacheReconciliation';
import { withOptimisticUpdate } from '@/store/withOptimisticUpdate';

interface HomeDestinationInput {
  baulIds: string[];
  currentBaulId: string | null;
  hasSeenOnboarding: boolean | null;
}

interface HomeDestinationDecision {
  destination: string;
  currentBaulId: string | null;
}

export function decideHomeDestination({
  baulIds,
  currentBaulId,
  hasSeenOnboarding,
}: HomeDestinationInput): HomeDestinationDecision {
  if (baulIds.length === 0) {
    // hasSeenOnboarding es null mientras no se ha cargado / tras un fallo del perfil — se
    // trata como "no visto" para no arriesgarse a saltarse el carrusel silenciosamente.
    return {
      destination: hasSeenOnboarding ? '/baules/nuevo' : '/onboarding',
      currentBaulId: null,
    };
  }

  const targetBaulId = currentBaulId && baulIds.includes(currentBaulId)
    ? currentBaulId
    : baulIds[0];

  return {
    destination: `/baules/${targetBaulId}`,
    currentBaulId: targetBaulId,
  };
}

// Decide a qué pantalla debe entrar el usuario al autenticarse o al navegar a "/baules": el
// CurrentBaul persistido (si sigue perteneciéndole) o, si no, el primero de la lista — y lo
// persiste como nuevo CurrentBaul. Sin baúles, reutiliza la misma decisión onboarding/crear-baúl
// que ya existía. Único punto de verdad, usado tanto por el arranque de App.tsx como por
// HomeRedirectRoute, para que ambos apliquen el mismo criterio.
export function resolveHomeDestination(baules: Baul[]): string {
  const { currentBaulId, setCurrentBaulId } = useCurrentBaulStore.getState();
  const decision = decideHomeDestination({
    baulIds: baules.map((baul) => baul.id),
    currentBaulId,
    hasSeenOnboarding: useAuthStore.getState().hasSeenOnboarding,
  });

  if (decision.currentBaulId && decision.currentBaulId !== currentBaulId) {
    setCurrentBaulId(decision.currentBaulId);
  }

  return decision.destination;
}

export async function loadChapters(baulId: string): Promise<void> {
  const chapters = await api.chapters.getAll(baulId);
  useBaulesStore.setState((state) => ({ chapters: { ...state.chapters, [baulId]: chapters } }));
}

export async function createBaul(name: string, description: string): Promise<Baul> {
  const baul = await api.baules.create(name, description);
  useBaulesStore.setState((state) => ({ baules: [baul, ...state.baules] }));
  return baul;
}

// Optimista: si se conoce ya la miniatura de la foto elegida, se aplica de inmediato
// (mismo criterio que ya usa uploadPhotos al rellenar coverPhotoUrl con thumbnailUrl)
// para que el menú de "establecer portada" dé feedback instantáneo en vez de quedarse
// mudo hasta que responda el servidor. Si la petición falla, se revierte al snapshot previo
// (ver withOptimisticUpdate para el detalle de snapshot/apply/rollback compartido).
export async function setBaulCover(
  baulId: string, photoId: string, crop: PhotoCrop, optimisticThumbnailUrl?: string
): Promise<void> {
  await withOptimisticUpdate({
    getSnapshot: () => useBaulesStore.getState().baules,
    applyOptimistic: optimisticThumbnailUrl
      ? () => useBaulesStore.setState((state) => ({
          baules: applyCoverUpdate(state.baules, baulId, optimisticThumbnailUrl),
        }))
      : undefined,
    rollback: (previous) => useBaulesStore.setState({ baules: previous }),
    operation: async () => {
      const updated = await api.baules.setCover(baulId, photoId, crop);
      useBaulesStore.setState((state) => ({ baules: state.baules.map((b) => (b.id === baulId ? updated : b)) }));
    },
  });
}

export async function renameBaul(baulId: string, name: string, description?: string): Promise<void> {
  const updated = await api.baules.update(baulId, name, description);
  useBaulesStore.setState((state) => ({
    baules: state.baules.map((b) => (b.id === baulId ? updated : b)),
  }));
}
