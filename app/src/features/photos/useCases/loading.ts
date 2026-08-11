import { api } from '@/api';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePhotosStore } from '@/store/usePhotosStore';

export async function loadChapterPhotos(chapterId: string): Promise<void> {
  const photos = await api.photos.getAll(chapterId);
  usePhotosStore.getState().upsertPhotos(photos);
  useBaulesStore.setState((state) => ({ photos: { ...state.photos, [chapterId]: photos.map((photo) => photo.id) } }));
}

export async function loadLoosePhotos(baulId: string): Promise<void> {
  const photos = await api.baules.getLoosePhotos(baulId);
  usePhotosStore.getState().upsertPhotos(photos);
  useBaulesStore.setState((state) => ({ loosePhotos: { ...state.loosePhotos, [baulId]: photos.map((photo) => photo.id) } }));
}

// One upload batch's own photos — backs the feed card's grid/gallery drill-down (see
// PhotoBatchGridRoute/PhotoBatchViewerRoute).
export async function loadPhotoBatchPhotos(baulId: string, batchId: string): Promise<void> {
  const photos = await api.photoBatches.getPhotos(baulId, batchId);
  usePhotosStore.getState().upsertPhotos(photos);
  useBaulesStore.setState((state) => ({ photoBatchPhotos: { ...state.photoBatchPhotos, [batchId]: photos.map((photo) => photo.id) } }));
}
