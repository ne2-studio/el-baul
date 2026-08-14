import { PhotoCrop, api } from '@/api';
import { Chapter, PhotoDate } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { clearChapterRecuerdos } from '@/features/memories/useCases';
import { applyCoverUpdate } from '@/store/baulesCacheReconciliation';

// No hay estado que actualizar: la cuadrícula de fotos no muestra chips de personas
// etiquetadas (solo el visor de una foto lo hace, vía taggedPersonas).
export async function addTaggedPersonasBatch(baulId: string, photoIds: string[], personaIds: string[]): Promise<void> {
  await api.photos.addTaggedPersonasBatch(baulId, photoIds, personaIds);
}

export async function createChapter(baulId: string, name: string): Promise<Chapter> {
  const chapter = await api.chapters.create(baulId, name);
  useBaulesStore.setState((state) => ({
    chapters: { ...state.chapters, [baulId]: [...(state.chapters[baulId] || []), chapter] },
    baules: state.baules.map((b) => (b.id === baulId ? { ...b, chapterCount: b.chapterCount + 1 } : b)),
  }));
  return chapter;
}

export async function changePhotoDateBatch(
  baulId: string,
  photoIds: string[],
  date: PhotoDate
): Promise<void> {
  const updated = await api.photos.changeDateBatch(photoIds, date);
  usePhotosStore.getState().upsertPhotos(updated);

  const chapters = await api.chapters.getAll(baulId);
  useBaulesStore.setState((state) => ({ chapters: { ...state.chapters, [baulId]: chapters } }));
}

export async function clearPhotoDateBatch(baulId: string, photoIds: string[]): Promise<void> {
  const updated = await api.photos.clearDateBatch(photoIds);
  usePhotosStore.getState().upsertPhotos(updated);

  const chapters = await api.chapters.getAll(baulId);
  useBaulesStore.setState((state) => ({ chapters: { ...state.chapters, [baulId]: chapters } }));
}

export async function setChapterCover(
  baulId: string,
  chapterId: string,
  photoId: string,
  crop: PhotoCrop,
  optimisticThumbnailUrl?: string
): Promise<void> {
  const previous = useBaulesStore.getState().chapters[baulId] || [];
  if (optimisticThumbnailUrl) {
    useBaulesStore.setState((state) => ({
      chapters: {
        ...state.chapters,
        [baulId]: applyCoverUpdate(previous, chapterId, optimisticThumbnailUrl),
      },
    }));
  }
  try {
    const updated = await api.chapters.setCover(baulId, chapterId, photoId, crop);
    useBaulesStore.setState((state) => ({
      chapters: {
        ...state.chapters,
        [baulId]: (state.chapters[baulId] || []).map((a) => (a.id === chapterId ? updated : a)),
      },
    }));
  } catch (error) {
    useBaulesStore.setState((state) => ({ chapters: { ...state.chapters, [baulId]: previous } }));
    throw error;
  }
}

export async function renameChapter(baulId: string, chapterId: string, name: string): Promise<void> {
  const updated = await api.chapters.update(baulId, chapterId, name);
  useBaulesStore.setState((state) => ({
    chapters: {
      ...state.chapters,
      [baulId]: (state.chapters[baulId] || []).map((a) => (a.id === chapterId ? updated : a)),
    },
  }));
}

export async function deleteChapter(baulId: string, chapterId: string): Promise<void> {
  await api.chapters.delete(baulId, chapterId);

  useBaulesStore.setState((state) => {
    const { [chapterId]: _removedPhotos, ...restPhotos } = state.photos;
    return {
      chapters: { ...state.chapters, [baulId]: (state.chapters[baulId] || []).filter((a) => a.id !== chapterId) },
      photos: restPhotos,
    };
  });
  clearChapterRecuerdos(chapterId);

  const [loosePhotos, baulRecuerdos] = await Promise.all([
    api.baules.getLoosePhotos(baulId),
    api.recuerdos.getAllByBaul(baulId),
  ]);
  usePhotosStore.getState().upsertPhotos(loosePhotos);
  useBaulesStore.setState((state) => ({
    loosePhotos: { ...state.loosePhotos, [baulId]: loosePhotos.map((photo) => photo.id) },
  }));
  useRecuerdosStore.setState((state) => ({ baulRecuerdos: { ...state.baulRecuerdos, [baulId]: baulRecuerdos } }));
}
