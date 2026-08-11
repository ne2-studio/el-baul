import { api } from '@/api';
import { PhotoDate } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePhotosStore } from '@/store/usePhotosStore';

// Sin chapterId: quien llama (cualquiera de los dos visores de fotos) no necesariamente sabe
// bajo qué capítulo/foto suelta está cacheada esta foto, pero ya no hace falta que lo sepa —
// borrarla de usePhotosStore es suficiente, cualquier lista de ids que la referenciase deja de
// resolverla la próxima vez que se hidrate (ver hydratePhotos). Los capítulos se refrescan
// siempre — puede que la foto perteneciera a uno y sus metadatos agregados (fecha, portada,
// contadores) hayan cambiado.
export async function deletePhoto(baulId: string, photoId: string, reason?: string): Promise<void> {
  await api.photos.delete(photoId, reason);

  usePhotosStore.getState().removePhoto(photoId);

  const chapters = await api.chapters.getAll(baulId);
  useBaulesStore.setState((state) => ({ chapters: { ...state.chapters, [baulId]: chapters } }));
}

export async function changePhotoDate(baulId: string, photoId: string, date: PhotoDate): Promise<void> {
  const updated = await api.photos.changeDate(photoId, date);
  usePhotosStore.getState().upsertPhotos([updated]);

  const chapters = await api.chapters.getAll(baulId);
  useBaulesStore.setState((state) => ({ chapters: { ...state.chapters, [baulId]: chapters } }));
}

export async function clearPhotoDate(baulId: string, photoId: string): Promise<void> {
  const updated = await api.photos.clearDate(photoId);
  usePhotosStore.getState().upsertPhotos([updated]);

  const chapters = await api.chapters.getAll(baulId);
  useBaulesStore.setState((state) => ({ chapters: { ...state.chapters, [baulId]: chapters } }));
}
