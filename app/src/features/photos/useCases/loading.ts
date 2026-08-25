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

// Baúl-wide "Fotos" tab page size — matches CoverPhotoPickerModal's own picker grid (same
// 3-column swimlane layout, same imgproxy thumbnail cost per item).
const BAUL_PHOTOS_PAGE_SIZE = 60;

// Loads (and replaces) the first page for the "Fotos" tab — every chapter's photos + loose
// ones, already ordered chronologically ascending server-side (PhotoOrdering.OrderByChronology).
// See loadMoreBaulPhotos for subsequent pages.
export async function loadBaulPhotos(baulId: string): Promise<void> {
  const { photos, hasMore } = await api.photos.getPage(baulId, { skip: 0, take: BAUL_PHOTOS_PAGE_SIZE });
  usePhotosStore.getState().upsertPhotos(photos);
  useBaulesStore.setState((state) => ({
    baulPhotos: { ...state.baulPhotos, [baulId]: photos.map((photo) => photo.id) },
    baulPhotosHasMore: { ...state.baulPhotosHasMore, [baulId]: hasMore },
  }));
}

// Appends the next page after whatever's already cached — skip is derived from the current
// cache length rather than tracked separately, same convention as loadMoreBaulFeed.
export async function loadMoreBaulPhotos(baulId: string): Promise<void> {
  const alreadyLoaded = useBaulesStore.getState().baulPhotos[baulId]?.length ?? 0;
  const { photos, hasMore } = await api.photos.getPage(baulId, { skip: alreadyLoaded, take: BAUL_PHOTOS_PAGE_SIZE });
  usePhotosStore.getState().upsertPhotos(photos);
  useBaulesStore.setState((state) => ({
    baulPhotos: { ...state.baulPhotos, [baulId]: [...(state.baulPhotos[baulId] || []), ...photos.map((photo) => photo.id)] },
    baulPhotosHasMore: { ...state.baulPhotosHasMore, [baulId]: hasMore },
  }));
}
