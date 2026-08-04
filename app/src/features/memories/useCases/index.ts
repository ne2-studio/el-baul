import { api } from '@/api';
import { Recuerdo } from '@/types';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';

export async function loadRecuerdos(photoId: string): Promise<void> {
  const recuerdos = await api.recuerdos.getAll(photoId);
  useRecuerdosStore.setState((state) => ({ recuerdos: { ...state.recuerdos, [photoId]: recuerdos } }));
}

export async function addRecuerdo(baulId: string, photoId: string, text: string): Promise<void> {
  const recuerdo = await api.recuerdos.create(photoId, text);
  useRecuerdosStore.setState((state) => ({
    recuerdos: { ...state.recuerdos, [photoId]: [...(state.recuerdos[photoId] || []), recuerdo] },
    // Keeps the baúl-wide "Recuerdos" tab in sync — otherwise it stays stale until
    // BaulRoute is remounted, since its own load is guarded by "already have a cached
    // value for this baulId" (see BaulRoute.tsx). Only patches it when already loaded:
    // creating a one-item stub here would make that guard think it's fully loaded.
    baulRecuerdos: state.baulRecuerdos[baulId]
      ? { ...state.baulRecuerdos, [baulId]: [recuerdo, ...state.baulRecuerdos[baulId]] }
      : state.baulRecuerdos,
  }));
}

export async function loadChapterRecuerdos(baulId: string, chapterId: string): Promise<void> {
  const recuerdos = await api.recuerdos.getAllByChapter(baulId, chapterId);
  useRecuerdosStore.setState((state) => ({ chapterRecuerdos: { ...state.chapterRecuerdos, [chapterId]: recuerdos } }));
}

export async function addChapterRecuerdo(baulId: string, chapterId: string, text: string): Promise<void> {
  const recuerdo = await api.recuerdos.createForChapter(baulId, chapterId, text);
  useRecuerdosStore.setState((state) => ({
    chapterRecuerdos: { ...state.chapterRecuerdos, [chapterId]: [recuerdo, ...(state.chapterRecuerdos[chapterId] || [])] },
    // Same reasoning as addRecuerdo above — keep the baúl-wide tab's cache in sync too.
    baulRecuerdos: state.baulRecuerdos[baulId]
      ? { ...state.baulRecuerdos, [baulId]: [recuerdo, ...state.baulRecuerdos[baulId]] }
      : state.baulRecuerdos,
  }));
}

export async function loadBaulRecuerdos(baulId: string): Promise<void> {
  const recuerdos = await api.recuerdos.getAllByBaul(baulId);
  useRecuerdosStore.setState((state) => ({ baulRecuerdos: { ...state.baulRecuerdos, [baulId]: recuerdos } }));
}

export async function addBaulRecuerdo(baulId: string, text: string): Promise<void> {
  const recuerdo = await api.recuerdos.createStandalone(baulId, text);
  useRecuerdosStore.setState((state) => ({
    baulRecuerdos: { ...state.baulRecuerdos, [baulId]: [recuerdo, ...(state.baulRecuerdos[baulId] || [])] },
  }));
}

export async function editRecuerdo(recuerdoId: string, text: string): Promise<void> {
  const updated = await api.recuerdos.update(recuerdoId, text);
  const replace = (items: Recuerdo[]) => items.map((recuerdo) => recuerdo.id === updated.id ? updated : recuerdo);

  useRecuerdosStore.setState((state) => ({
    recuerdos: Object.fromEntries(Object.entries(state.recuerdos).map(([key, items]) => [key, replace(items)])),
    chapterRecuerdos: Object.fromEntries(Object.entries(state.chapterRecuerdos).map(([key, items]) => [key, replace(items)])),
    baulRecuerdos: Object.fromEntries(Object.entries(state.baulRecuerdos).map(([key, items]) => [key, replace(items)])),
  }));
}

// Used by features/chapters/useCases.deleteChapter — an explicit cross-feature call rather
// than this store implicitly reacting to a chapter being deleted elsewhere.
export function clearChapterRecuerdos(chapterId: string): void {
  useRecuerdosStore.setState((state) => {
    const { [chapterId]: _removed, ...rest } = state.chapterRecuerdos;
    return { chapterRecuerdos: rest };
  });
}
