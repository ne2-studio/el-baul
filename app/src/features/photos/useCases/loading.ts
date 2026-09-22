import { api } from '@/api';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { useMyPhotosStore } from '@/store/useMyPhotosStore';
import { useDevicePhotosStore } from '@/store/useDevicePhotosStore';
import { useDeviceAlbumsStore } from '@/store/useDeviceAlbumsStore';
import { DeviceAlbum, DevicePhoto, DevicePhotos } from '@/features/photos/native/devicePhotos';

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

// "Mis fotos" (docs/.backlog issue #62) — user-scoped, not keyed by baulId. Unlike
// loadBaulPhotos/loadMoreBaulPhotos, PhotoAsset isn't normalized into a shared by-id store: it's
// only ever consumed within this one feature, so useMyPhotosStore.assets holds the objects
// directly instead of ids + a lookup table. Always loads the currently active filter
// (Slice 3, docs/.backlog issue #62) — see useMyPhotosStore's own doc comment on why only one
// filter's page is cached at a time.
export async function loadMyPhotos(): Promise<void> {
  const filter = useMyPhotosStore.getState().filter;
  const { assets, hasMore } = await api.myPhotos.getPage({ skip: 0, take: BAUL_PHOTOS_PAGE_SIZE, filter });
  useMyPhotosStore.getState().setPage(assets, hasMore);
}

export async function loadMoreMyPhotos(): Promise<void> {
  const { filter, assets: loaded } = useMyPhotosStore.getState();
  const { assets, hasMore } = await api.myPhotos.getPage({ skip: loaded?.length ?? 0, take: BAUL_PHOTOS_PAGE_SIZE, filter });
  useMyPhotosStore.getState().appendPage(assets, hasMore);
}

// "En este dispositivo" — same page size as the rest of the photo grids above, but sourced from
// the native MediaStore bridge instead of the API (see docs' native-android.md and this
// feature's boundary note in EnEsteDispositivoRoute.tsx). albumId scopes the fetch to one
// MediaStore bucket (or the flat library when omitted) and is recorded as the store's
// loadedAlbumId so a later mount for a different album knows to refetch instead of reusing
// stale photos.
export async function ensureDevicePhotosPermission(): Promise<boolean> {
  const store = useDevicePhotosStore.getState();
  const { granted } = await DevicePhotos.checkPermissions();
  if (granted) {
    store.setPermission('granted');
    return true;
  }

  const requested = await DevicePhotos.requestPermissions();
  store.setPermission(requested.granted ? 'granted' : 'denied');
  return requested.granted;
}

// albumId scopes both to a single MediaStore bucket (see the "carpetas" grid below) — omitted,
// this is the flat all-photos load used before that grid existed.
export async function loadDevicePhotos(albumId?: string): Promise<void> {
  const { photos, nextCursor } = await DevicePhotos.getPhotos({ limit: BAUL_PHOTOS_PAGE_SIZE, albumId });
  useDevicePhotosStore.getState().setPage(photos.map((p) => new DevicePhoto(p)), nextCursor !== undefined, nextCursor, albumId);
}

export async function loadMoreDevicePhotos(albumId?: string): Promise<void> {
  const cursor = useDevicePhotosStore.getState().nextCursor;
  const { photos, nextCursor } = await DevicePhotos.getPhotos({ cursor, limit: BAUL_PHOTOS_PAGE_SIZE, albumId });
  useDevicePhotosStore.getState().appendPage(photos.map((p) => new DevicePhoto(p)), nextCursor !== undefined, nextCursor);
}

// "Carpetas" grid shown before any album is opened — one row per MediaStore bucket (see
// DevicePhotosPlugin.getAlbums). Same one-per-device-library cardinality note as
// ensureDevicePhotosPermission above.
export async function loadDeviceAlbums(): Promise<void> {
  const { albums } = await DevicePhotos.getAlbums();
  useDeviceAlbumsStore.getState().setAlbums(albums.map((a) => new DeviceAlbum(a)));
}
