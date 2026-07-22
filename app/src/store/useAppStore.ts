import { create } from 'zustand';
import * as Sentry from '@sentry/react';
import { Baul, Album, Photo, SharedUser, RemovalRequest, BaulRole, Recuerdo, Subscription, UserProfile, PhotoDate } from '@/types';
import { api } from '@/api';
import { isAdminRole } from '@/utils/roleUtils';
import { ChapterSelection } from '@/app/components/ChapterSelector';

const defaultSubscription: Subscription = {
  currentPlan: 'gratuito',
  baulesUsed: 0,
  baulesLimit: 2,
  storagePerBaulGB: 10,
};

export interface UploadItem {
  clientUploadId: string;
  file: File;
  caption?: string;
  date?: PhotoDate;
}

export interface UploadItemResult {
  clientUploadId: string;
  photo?: Photo;
  error?: string;
}

// Confirms the File/Blob still has readable bytes before we try to upload it. Files
// picked a while ago (the chapter/date step can add a real delay before the user hits
// confirm) have occasionally failed to upload in production with a bare
// `TypeError: Failed to fetch` and zero backend logs — consistent with the browser
// failing to read the file while building the multipart body, before any request ever
// reaches the network. Tagging this phase separately in Sentry tells that case apart
// from an actual network/proxy failure on the next occurrence.
async function verifyFileReadable(file: File): Promise<void> {
  await file.slice(0, 16).arrayBuffer();
}

interface AppState {
  // Auth-derived state. The raw access token itself lives only in api.ts.
  isAuthenticated: boolean;
  userProfile: { photoUrl: string; name: string; email: string };
  subscription: Subscription;

  // Domain data
  baules: Baul[];
  albums: Record<string, Album[]>;
  photos: Record<string, Photo[]>;
  loosePhotos: Record<string, Photo[]>;
  sharedUsers: Record<string, SharedUser[]>;
  removalRequests: Record<string, RemovalRequest[]>;
  recuerdos: Record<string, Recuerdo[]>;
  albumRecuerdos: Record<string, Recuerdo[]>;
  baulRecuerdos: Record<string, Recuerdo[]>;
  isLoading: boolean;

  setAuthenticated: (value: boolean) => void;
  setSubscription: (subscription: Subscription | ((prev: Subscription) => Subscription)) => void;
  reset: () => void;

  fetchData: () => Promise<void>;
  loadAlbums: (baulId: string) => Promise<void>;
  loadAlbumPhotos: (albumId: string) => Promise<void>;
  loadLoosePhotos: (baulId: string) => Promise<void>;
  loadRecuerdos: (photoId: string) => Promise<void>;
  addRecuerdo: (photoId: string, text: string) => Promise<void>;
  loadAlbumRecuerdos: (baulId: string, albumId: string) => Promise<void>;
  addAlbumRecuerdo: (baulId: string, albumId: string, text: string) => Promise<void>;
  loadBaulRecuerdos: (baulId: string) => Promise<void>;
  addBaulRecuerdo: (baulId: string, text: string) => Promise<void>;

  createBaul: (name: string, description: string) => Promise<Baul>;
  createAlbum: (baulId: string, name: string, description: string) => Promise<Album>;
  uploadPhotos: (
    baulId: string,
    albumId: string,
    selectedPhotos: UploadItem[],
    onItemSettled?: (result: UploadItemResult) => void
  ) => Promise<UploadItemResult[]>;
  uploadLoosePhotos: (
    baulId: string,
    selectedPhotos: UploadItem[],
    onItemSettled?: (result: UploadItemResult) => void
  ) => Promise<UploadItemResult[]>;
  uploadPhotosWithChapter: (
    baulId: string,
    chapter: ChapterSelection,
    selectedPhotos: UploadItem[],
    onItemSettled?: (result: UploadItemResult) => void
  ) => Promise<{ results: UploadItemResult[]; albumId: string | null }>;
  movePhotos: (
    baulId: string,
    sourceAlbumId: string | null,
    photoIds: string[],
    targetAlbumId: string,
    onItemSettled?: (result: { photoId: string; error?: string }) => void
  ) => Promise<void>;
  deletePhoto: (baulId: string, albumId: string | null, photoId: string, reason?: string) => Promise<void>;
  changePhotoDate: (baulId: string, albumId: string | null, photoId: string, date: PhotoDate) => Promise<void>;
  changePhotoDateBatch: (baulId: string, albumId: string | null, photoIds: string[], date: PhotoDate) => Promise<void>;
  setBaulCover: (baulId: string, photoId: string, optimisticThumbnailUrl?: string) => Promise<void>;
  setAlbumCover: (baulId: string, albumId: string, photoId: string, optimisticThumbnailUrl?: string) => Promise<void>;
  renameBaul: (baulId: string, name: string, description?: string) => Promise<void>;
  renameAlbum: (baulId: string, albumId: string, name: string, description?: string) => Promise<void>;

  createPersona: (baulId: string, nickname: string) => Promise<void>;
  loadSharedUsers: (baulId: string) => Promise<void>;
  updatePersona: (baulId: string, sharedUserId: string, name: string, nickname: string) => Promise<void>;
  uploadPersonaAvatar: (baulId: string, sharedUserId: string, file: File) => Promise<void>;
  updateUserRole: (baulId: string, sharedUserId: string, role: BaulRole) => Promise<void>;
  revokeAccess: (baulId: string, sharedUserId: string) => Promise<void>;

  removePhoto: (baulId: string, requestId: string, photoId: string) => Promise<void>;
  keepPhoto: (baulId: string, requestId: string) => Promise<void>;
  // Solo se usa photo.id — se acepta cualquier objeto con id para no acoplar esta acción
  // al tipo Photo concreto de cada pantalla (PhotoViewer usa su propia interfaz local).
  submitRemovalRequest: (baulId: string, photo: { id: string }, reason: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  isAuthenticated: false,
  userProfile: { photoUrl: '', name: '', email: '' },
  subscription: defaultSubscription,

  baules: [],
  albums: {},
  photos: {},
  loosePhotos: {},
  sharedUsers: {},
  removalRequests: {},
  recuerdos: {},
  albumRecuerdos: {},
  baulRecuerdos: {},
  isLoading: true,

  setAuthenticated: (value) => set({ isAuthenticated: value }),

  setSubscription: (subscriptionOrFn) => set((state) => ({
    subscription: typeof subscriptionOrFn === 'function' ? subscriptionOrFn(state.subscription) : subscriptionOrFn,
  })),

  reset: () => set({
    isAuthenticated: false,
    userProfile: { photoUrl: '', name: '', email: '' },
    subscription: defaultSubscription,
    baules: [],
    albums: {},
    photos: {},
    loosePhotos: {},
    sharedUsers: {},
    removalRequests: {},
    recuerdos: {},
    albumRecuerdos: {},
    baulRecuerdos: {},
  }),

  fetchData: async () => {
    set({ isLoading: true });
    try {
      const [baules, profile] = await Promise.all([
        api.baules.getAll(),
        loadProfile(),
      ]);

      set({
        baules,
        userProfile: profile
          ? { photoUrl: '', name: profile.name || profile.email, email: profile.email }
          : get().userProfile,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loadAlbums: async (baulId) => {
    const albums = await api.albums.getAll(baulId);
    set((state) => ({ albums: { ...state.albums, [baulId]: albums } }));

    try {
      const sharedUsers = await api.baules.getSharedUsers(baulId);
      set((state) => ({ sharedUsers: { ...state.sharedUsers, [baulId]: sharedUsers } }));
    } catch (err) {
      console.log('No shared users or error loading:', err);
    }

    const baul = get().baules.find((b) => b.id === baulId);
    if (isAdminRole(baul?.role)) {
      try {
        const removalRequests = await api.baules.getRemovalRequests(baulId);
        set((state) => ({ removalRequests: { ...state.removalRequests, [baulId]: removalRequests } }));
      } catch (err) {
        console.log('No removal requests or error loading:', err);
      }
    }
  },

  loadAlbumPhotos: async (albumId) => {
    const photos = await api.photos.getAll(albumId);
    set((state) => ({ photos: { ...state.photos, [albumId]: photos } }));
  },

  loadLoosePhotos: async (baulId) => {
    const photos = await api.baules.getLoosePhotos(baulId);
    set((state) => ({ loosePhotos: { ...state.loosePhotos, [baulId]: photos } }));
  },

  loadRecuerdos: async (photoId) => {
    const recuerdos = await api.recuerdos.getAll(photoId);
    set((state) => ({ recuerdos: { ...state.recuerdos, [photoId]: recuerdos } }));
  },

  addRecuerdo: async (photoId, text) => {
    const recuerdo = await api.recuerdos.create(photoId, text);
    set((state) => ({
      recuerdos: { ...state.recuerdos, [photoId]: [...(state.recuerdos[photoId] || []), recuerdo] },
    }));
  },

  loadAlbumRecuerdos: async (baulId, albumId) => {
    const recuerdos = await api.recuerdos.getAllByAlbum(baulId, albumId);
    set((state) => ({ albumRecuerdos: { ...state.albumRecuerdos, [albumId]: recuerdos } }));
  },

  addAlbumRecuerdo: async (baulId, albumId, text) => {
    const recuerdo = await api.recuerdos.createForAlbum(baulId, albumId, text);
    set((state) => ({
      albumRecuerdos: { ...state.albumRecuerdos, [albumId]: [recuerdo, ...(state.albumRecuerdos[albumId] || [])] },
    }));
  },

  loadBaulRecuerdos: async (baulId) => {
    const recuerdos = await api.recuerdos.getAllByBaul(baulId);
    set((state) => ({ baulRecuerdos: { ...state.baulRecuerdos, [baulId]: recuerdos } }));
  },

  addBaulRecuerdo: async (baulId, text) => {
    const recuerdo = await api.recuerdos.createStandalone(baulId, text);
    set((state) => ({
      baulRecuerdos: { ...state.baulRecuerdos, [baulId]: [recuerdo, ...(state.baulRecuerdos[baulId] || [])] },
    }));
  },

  createBaul: async (name, description) => {
    const baul = await api.baules.create(name, description);
    set((state) => ({ baules: [baul, ...state.baules] }));
    return baul;
  },

  createAlbum: async (baulId, name, description) => {
    const album = await api.albums.create(baulId, name, description);
    set((state) => ({
      albums: { ...state.albums, [baulId]: [...(state.albums[baulId] || []), album] },
      baules: state.baules.map((b) => (b.id === baulId ? { ...b, albumCount: b.albumCount + 1 } : b)),
    }));
    return album;
  },

  uploadPhotos: async (baulId, albumId, selectedPhotos, onItemSettled) => {
    const uploaded: Photo[] = [];
    const results: UploadItemResult[] = [];
    for (const selected of selectedPhotos) {
      let result: UploadItemResult;
      try {
        await verifyFileReadable(selected.file);
      } catch (readError) {
        Sentry.captureException(readError, {
          tags: { phase: 'read-file-before-upload' },
          extra: { name: selected.file.name, size: selected.file.size, type: selected.file.type },
        });
        result = { clientUploadId: selected.clientUploadId, error: 'No se pudo leer la foto (puede que ya no esté disponible)' };
        results.push(result);
        onItemSettled?.(result);
        continue;
      }
      try {
        const photo = await api.photos.upload(albumId, selected.file, selected.clientUploadId, selected.caption, selected.date);
        uploaded.push(photo);
        result = { clientUploadId: selected.clientUploadId, photo };
      } catch (error) {
        Sentry.captureException(error, { tags: { phase: 'upload-request' } });
        result = { clientUploadId: selected.clientUploadId, error: error instanceof Error ? error.message : 'Upload failed' };
      }
      results.push(result);
      onItemSettled?.(result);
    }

    if (uploaded.length > 0) {
      // Re-fetch the album's full photo list from the server rather than appending
      // client-side — the album may not have been loaded into the store yet (e.g.
      // uploading via the native share flow into a chapter never opened this session),
      // and an append onto an empty/stale slice would silently drop its existing photos.
      // Mirrors the same fix already applied in movePhotos.
      const photosForAlbum = await api.photos.getAll(albumId);
      set((state) => ({
        photos: { ...state.photos, [albumId]: photosForAlbum },
        albums: {
          ...state.albums,
          [baulId]: (state.albums[baulId] || []).map((a) =>
            a.id === albumId
              ? {
                  ...a,
                  photoCount: a.photoCount + uploaded.length,
                  coverPhotoUrl: a.coverPhotoUrl || uploaded[0]?.thumbnailUrl,
                }
              : a
          ),
        },
        baules: state.baules.map((b) =>
          b.id === baulId
            ? { ...b, coverPhotoUrl: b.coverPhotoUrl || uploaded[0]?.thumbnailUrl }
            : b
        ),
      }));
    }

    return results;
  },

  uploadLoosePhotos: async (baulId, selectedPhotos, onItemSettled) => {
    const uploaded: Photo[] = [];
    const results: UploadItemResult[] = [];
    for (const selected of selectedPhotos) {
      let result: UploadItemResult;
      try {
        await verifyFileReadable(selected.file);
      } catch (readError) {
        Sentry.captureException(readError, {
          tags: { phase: 'read-file-before-upload' },
          extra: { name: selected.file.name, size: selected.file.size, type: selected.file.type },
        });
        result = { clientUploadId: selected.clientUploadId, error: 'No se pudo leer la foto (puede que ya no esté disponible)' };
        results.push(result);
        onItemSettled?.(result);
        continue;
      }
      try {
        const photo = await api.baules.uploadPhoto(baulId, selected.file, selected.clientUploadId, selected.caption, selected.date);
        uploaded.push(photo);
        result = { clientUploadId: selected.clientUploadId, photo };
      } catch (error) {
        Sentry.captureException(error, { tags: { phase: 'upload-request' } });
        result = { clientUploadId: selected.clientUploadId, error: error instanceof Error ? error.message : 'Upload failed' };
      }
      results.push(result);
      onItemSettled?.(result);
    }

    if (uploaded.length > 0) set((state) => ({
      loosePhotos: { ...state.loosePhotos, [baulId]: [...(state.loosePhotos[baulId] || []), ...uploaded] },
      baules: state.baules.map((b) =>
        b.id === baulId
          ? { ...b, coverPhotoUrl: b.coverPhotoUrl || uploaded[0]?.thumbnailUrl }
          : b
      ),
    }));

    return results;
  },

  uploadPhotosWithChapter: async (baulId, chapter, selectedPhotos, onItemSettled) => {
    let targetAlbumId: string | null = chapter.type === 'existing' ? chapter.albumId : null;

    if (chapter.type === 'new') {
      try {
        const album = await get().createAlbum(baulId, chapter.name, '');
        targetAlbumId = album.id;
      } catch (error) {
        Sentry.captureException(error);
        const message = error instanceof Error ? error.message : 'No se pudo crear el capítulo';
        const results = selectedPhotos.map((p) => {
          const result: UploadItemResult = { clientUploadId: p.clientUploadId, error: message };
          onItemSettled?.(result);
          return result;
        });
        return { results, albumId: null };
      }
    }

    const results = targetAlbumId
      ? await get().uploadPhotos(baulId, targetAlbumId, selectedPhotos, onItemSettled)
      : await get().uploadLoosePhotos(baulId, selectedPhotos, onItemSettled);

    return { results, albumId: targetAlbumId };
  },

  // Cada foto se mueve con su propia petición y su propio try/catch — igual que
  // uploadPhotos — para que un fallo a mitad de lote no aborte el resto ni deje el
  // store desincronizado con lo que sí se movió server-side (bug real: la versión
  // anterior lanzaba en el primer fallo sin haber reconciliado nada). Si hay algún
  // fallo se lanza al final, tras reconciliar los que sí tuvieron éxito, para que el
  // toast de error del caller siga disparándose.
  movePhotos: async (baulId, sourceAlbumId, photoIds, targetAlbumId, onItemSettled) => {
    const succeededIds: string[] = [];
    let failedCount = 0;
    for (const photoId of photoIds) {
      try {
        await api.photos.move(photoId, targetAlbumId);
        succeededIds.push(photoId);
        onItemSettled?.({ photoId });
      } catch (error) {
        failedCount += 1;
        onItemSettled?.({ photoId, error: error instanceof Error ? error.message : 'No se pudo mover la foto' });
      }
    }

    if (succeededIds.length === 0) {
      throw new Error(`No se pudo mover ninguna de las ${photoIds.length} fotos`);
    }

    // Re-fetch the target album's photos from the server rather than merging
    // client-side — the target may not have been loaded into the store yet
    // (e.g. moving into an album the user hasn't opened this session), and a
    // client-side merge against an empty/stale slice would silently drop its
    // existing photos.
    const targetPhotos = await api.photos.getAll(targetAlbumId);

    set((state) => {
      // sourceAlbumId is null when moving out of the "Fotos sueltas" virtual album.
      const sourcePhotos = sourceAlbumId ? (state.photos[sourceAlbumId] || []) : (state.loosePhotos[baulId] || []);
      const movedCount = sourcePhotos.filter((p) => succeededIds.includes(p.id)).length;
      const remainingSourcePhotos = sourcePhotos.filter((p) => !succeededIds.includes(p.id));

      return {
        photos: {
          ...state.photos,
          ...(sourceAlbumId ? { [sourceAlbumId]: remainingSourcePhotos } : {}),
          [targetAlbumId]: targetPhotos,
        },
        loosePhotos: sourceAlbumId
          ? state.loosePhotos
          : { ...state.loosePhotos, [baulId]: remainingSourcePhotos },
        albums: {
          ...state.albums,
          [baulId]: (state.albums[baulId] || []).map((a) => {
            if (sourceAlbumId && a.id === sourceAlbumId) return { ...a, photoCount: Math.max(0, a.photoCount - movedCount) };
            if (a.id === targetAlbumId) {
              return {
                ...a,
                photoCount: targetPhotos.length,
                coverPhotoUrl: a.coverPhotoUrl || targetPhotos[0]?.thumbnailUrl,
              };
            }
            return a;
          }),
        },
      };
    });

    if (failedCount > 0) {
      throw new Error(`${failedCount} de ${photoIds.length} fotos no se pudieron mover`);
    }
  },

  deletePhoto: async (baulId, albumId, photoId, reason) => {
    await api.photos.delete(photoId, reason);

    set((state) => (albumId
      ? { photos: { ...state.photos, [albumId]: (state.photos[albumId] || []).filter((p) => p.id !== photoId) } }
      : { loosePhotos: { ...state.loosePhotos, [baulId]: (state.loosePhotos[baulId] || []).filter((p) => p.id !== photoId) } }
    ));

    if (albumId) {
      const albums = await api.albums.getAll(baulId);
      set((state) => ({ albums: { ...state.albums, [baulId]: albums } }));
    }
  },

  changePhotoDate: async (baulId, albumId, photoId, date) => {
    const updated = await api.photos.changeDate(photoId, date);
    set((state) => (albumId
      ? { photos: { ...state.photos, [albumId]: (state.photos[albumId] || []).map((p) => (p.id === photoId ? updated : p)) } }
      : { loosePhotos: { ...state.loosePhotos, [baulId]: (state.loosePhotos[baulId] || []).map((p) => (p.id === photoId ? updated : p)) } }
    ));

    const albums = await api.albums.getAll(baulId);
    set((state) => ({ albums: { ...state.albums, [baulId]: albums } }));
  },

  changePhotoDateBatch: async (baulId, albumId, photoIds, date) => {
    const updated = await api.photos.changeDateBatch(photoIds, date);
    const updatedById = new Map(updated.map((p) => [p.id, p]));
    set((state) => (albumId
      ? { photos: { ...state.photos, [albumId]: (state.photos[albumId] || []).map((p) => updatedById.get(p.id) || p) } }
      : { loosePhotos: { ...state.loosePhotos, [baulId]: (state.loosePhotos[baulId] || []).map((p) => updatedById.get(p.id) || p) } }
    ));

    const albums = await api.albums.getAll(baulId);
    set((state) => ({ albums: { ...state.albums, [baulId]: albums } }));
  },

  // Optimista: si se conoce ya la miniatura de la foto elegida, se aplica de inmediato
  // (mismo criterio que ya usa uploadPhotos al rellenar coverPhotoUrl con thumbnailUrl)
  // para que el menú de "establecer portada" dé feedback instantáneo en vez de quedarse
  // mudo hasta que responda el servidor. Si la petición falla, se revierte al snapshot previo.
  setBaulCover: async (baulId, photoId, optimisticThumbnailUrl) => {
    const previous = get().baules;
    if (optimisticThumbnailUrl) {
      set((state) => ({
        baules: state.baules.map((b) => (b.id === baulId ? { ...b, coverPhotoUrl: optimisticThumbnailUrl } : b)),
      }));
    }
    try {
      const updated = await api.baules.setCover(baulId, photoId);
      set((state) => ({ baules: state.baules.map((b) => (b.id === baulId ? updated : b)) }));
    } catch (error) {
      set({ baules: previous });
      throw error;
    }
  },

  setAlbumCover: async (baulId, albumId, photoId, optimisticThumbnailUrl) => {
    const previous = get().albums[baulId] || [];
    if (optimisticThumbnailUrl) {
      set((state) => ({
        albums: {
          ...state.albums,
          [baulId]: previous.map((a) => (a.id === albumId ? { ...a, coverPhotoUrl: optimisticThumbnailUrl } : a)),
        },
      }));
    }
    try {
      const updated = await api.albums.setCover(baulId, albumId, photoId);
      set((state) => ({
        albums: {
          ...state.albums,
          [baulId]: (state.albums[baulId] || []).map((a) => (a.id === albumId ? updated : a)),
        },
      }));
    } catch (error) {
      set((state) => ({ albums: { ...state.albums, [baulId]: previous } }));
      throw error;
    }
  },

  renameBaul: async (baulId, name, description) => {
    const updated = await api.baules.update(baulId, name, description);
    set((state) => ({
      baules: state.baules.map((b) => (b.id === baulId ? updated : b)),
    }));
  },

  renameAlbum: async (baulId, albumId, name, description) => {
    const updated = await api.albums.update(baulId, albumId, name, description);
    set((state) => ({
      albums: {
        ...state.albums,
        [baulId]: (state.albums[baulId] || []).map((a) => (a.id === albumId ? updated : a)),
      },
    }));
  },

  createPersona: async (baulId, nickname) => {
    const persona = await api.baules.createPersona(baulId, nickname);
    set((state) => ({
      sharedUsers: { ...state.sharedUsers, [baulId]: [...(state.sharedUsers[baulId] || []), persona] },
    }));
  },

  loadSharedUsers: async (baulId) => {
    const sharedUsers = await api.baules.getSharedUsers(baulId);
    set((state) => ({ sharedUsers: { ...state.sharedUsers, [baulId]: sharedUsers } }));
  },

  updatePersona: async (baulId, sharedUserId, name, nickname) => {
    const updated = await api.baules.updatePersona(baulId, sharedUserId, name, nickname);
    set((state) => ({
      sharedUsers: {
        ...state.sharedUsers,
        [baulId]: (state.sharedUsers[baulId] || []).map((u) => (u.id === sharedUserId ? updated : u)),
      },
    }));
  },

  uploadPersonaAvatar: async (baulId, sharedUserId, file) => {
    const updated = await api.baules.uploadPersonaAvatar(baulId, sharedUserId, file);
    set((state) => ({
      sharedUsers: {
        ...state.sharedUsers,
        [baulId]: (state.sharedUsers[baulId] || []).map((u) => (u.id === sharedUserId ? updated : u)),
      },
    }));
  },

  // Optimista: el <select> de rol está controlado por este valor, así que sin aplicar
  // el cambio antes del await se ve "rebotar" al valor anterior mientras se espera al
  // servidor. Si la petición falla, se revierte al snapshot previo.
  updateUserRole: async (baulId, sharedUserId, role) => {
    const previous = get().sharedUsers[baulId] || [];
    set((state) => ({
      sharedUsers: {
        ...state.sharedUsers,
        [baulId]: previous.map((u) => (u.id === sharedUserId ? { ...u, role } : u)),
      },
    }));
    try {
      await api.baules.updateSharedUserRole(baulId, sharedUserId, role);
    } catch (error) {
      set((state) => ({ sharedUsers: { ...state.sharedUsers, [baulId]: previous } }));
      throw error;
    }
  },

  revokeAccess: async (baulId, sharedUserId) => {
    await api.baules.revokeAccess(baulId, sharedUserId);
    set((state) => ({
      sharedUsers: {
        ...state.sharedUsers,
        [baulId]: (state.sharedUsers[baulId] || []).filter((u) => u.id !== sharedUserId),
      },
    }));
  },

  removePhoto: async (baulId, requestId, photoId) => {
    await api.baules.approveRemovalRequest(baulId, requestId);
    set((state) => {
      const photos = { ...state.photos };
      for (const albumId of Object.keys(photos)) {
        photos[albumId] = photos[albumId].filter((p) => p.id !== photoId);
      }

      const loosePhotos = { ...state.loosePhotos };
      for (const id of Object.keys(loosePhotos)) {
        loosePhotos[id] = loosePhotos[id].filter((p) => p.id !== photoId);
      }

      return {
        photos,
        loosePhotos,
        removalRequests: {
          ...state.removalRequests,
          [baulId]: (state.removalRequests[baulId] || []).filter((r) => r.id !== requestId),
        },
      };
    });
  },

  keepPhoto: async (baulId, requestId) => {
    await api.baules.rejectRemovalRequest(baulId, requestId);
    set((state) => ({
      removalRequests: {
        ...state.removalRequests,
        [baulId]: (state.removalRequests[baulId] || []).filter((r) => r.id !== requestId),
      },
    }));
  },

  submitRemovalRequest: async (baulId, photo, reason) => {
    await api.baules.submitRemovalRequest(baulId, photo.id, reason);
  },
}));

async function loadProfile(): Promise<UserProfile | null> {
  try {
    return await api.users.getProfile();
  } catch (error) {
    console.log('Failed to load user profile:', error);
    return null;
  }
}
