import { api } from '@/api';
import { Baul } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { applyCoverUpdate } from '@/store/baulesCacheReconciliation';
import { getBaulPermissions } from '@/utils/roleUtils';
import { loadPersonas } from '@/features/people/useCases';
import { loadRemovalRequests } from '@/features/photos/useCases';

export async function loadChapters(baulId: string): Promise<void> {
  const chapters = await api.chapters.getAll(baulId);
  useBaulesStore.setState((state) => ({ chapters: { ...state.chapters, [baulId]: chapters } }));

  await loadPersonas(baulId);

  const baul = useBaulesStore.getState().baules.find((b) => b.id === baulId);
  if (getBaulPermissions(baul).canReviewRemovalRequests) {
    await loadRemovalRequests(baulId);
  }
}

export async function createBaul(name: string, description: string): Promise<Baul> {
  const baul = await api.baules.create(name, description);
  useBaulesStore.setState((state) => ({ baules: [baul, ...state.baules] }));
  return baul;
}

// Optimista: si se conoce ya la miniatura de la foto elegida, se aplica de inmediato
// (mismo criterio que ya usa uploadPhotos al rellenar coverPhotoUrl con thumbnailUrl)
// para que el menú de "establecer portada" dé feedback instantáneo en vez de quedarse
// mudo hasta que responda el servidor. Si la petición falla, se revierte al snapshot previo.
export async function setBaulCover(baulId: string, photoId: string, optimisticThumbnailUrl?: string): Promise<void> {
  const previous = useBaulesStore.getState().baules;
  if (optimisticThumbnailUrl) {
    useBaulesStore.setState((state) => ({ baules: applyCoverUpdate(state.baules, baulId, optimisticThumbnailUrl) }));
  }
  try {
    const updated = await api.baules.setCover(baulId, photoId);
    useBaulesStore.setState((state) => ({ baules: state.baules.map((b) => (b.id === baulId ? updated : b)) }));
  } catch (error) {
    useBaulesStore.setState({ baules: previous });
    throw error;
  }
}

export async function renameBaul(baulId: string, name: string, description?: string): Promise<void> {
  const updated = await api.baules.update(baulId, name, description);
  useBaulesStore.setState((state) => ({
    baules: state.baules.map((b) => (b.id === baulId ? updated : b)),
  }));
}
