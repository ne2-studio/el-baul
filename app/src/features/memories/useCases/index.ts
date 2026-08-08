import { api } from '@/api';
import { FeedItem, Recuerdo } from '@/types';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';

// Prepends a just-created recuerdo to a cached baulFeed entry, matching baulRecuerdos' own
// "only patch if already loaded" guard above — a just-created recuerdo is always newest, so
// prepending (rather than re-sorting against the feed's photo-batch items too) is correct.
function prependToBaulFeed(baulFeed: Record<string, FeedItem[]>, baulId: string, recuerdo: Recuerdo): Record<string, FeedItem[]> {
  if (!baulFeed[baulId]) return baulFeed;
  return { ...baulFeed, [baulId]: [{ type: 'recuerdo', createdAt: recuerdo.createdAt, recuerdo }, ...baulFeed[baulId]] };
}

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
    baulFeed: prependToBaulFeed(state.baulFeed, baulId, recuerdo),
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
    baulFeed: prependToBaulFeed(state.baulFeed, baulId, recuerdo),
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
    baulFeed: prependToBaulFeed(state.baulFeed, baulId, recuerdo),
  }));
}

// Feed behind Features:BaulFeedEnabled — recuerdos + photo-upload-batch cards, merged and
// sorted server-side (see BaulFeedManager). loadBaulRecuerdos above stays the toggle-off path.
export async function loadBaulFeed(baulId: string): Promise<void> {
  const feed = await api.baules.getFeed(baulId);
  useRecuerdosStore.setState((state) => ({ baulFeed: { ...state.baulFeed, [baulId]: feed } }));
}

export async function editRecuerdo(recuerdoId: string, text: string): Promise<void> {
  const updated = await api.recuerdos.update(recuerdoId, text);
  const replace = (items: Recuerdo[]) => items.map((recuerdo) => recuerdo.id === updated.id ? updated : recuerdo);
  const replaceInFeed = (items: FeedItem[]) => items.map((item) =>
    item.type === 'recuerdo' && item.recuerdo.id === updated.id ? { ...item, recuerdo: updated } : item
  );

  useRecuerdosStore.setState((state) => ({
    recuerdos: Object.fromEntries(Object.entries(state.recuerdos).map(([key, items]) => [key, replace(items)])),
    chapterRecuerdos: Object.fromEntries(Object.entries(state.chapterRecuerdos).map(([key, items]) => [key, replace(items)])),
    baulRecuerdos: Object.fromEntries(Object.entries(state.baulRecuerdos).map(([key, items]) => [key, replace(items)])),
    baulFeed: Object.fromEntries(Object.entries(state.baulFeed).map(([key, items]) => [key, replaceInFeed(items)])),
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
