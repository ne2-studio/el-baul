import { create } from 'zustand';
import * as Sentry from '@sentry/react';
import { Baul, Chapter, Photo, Persona, RemovalRequest, BaulRole, Recuerdo, Subscription, UserProfile, PhotoDate } from '@/types';
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
  chapters: Record<string, Chapter[]>;
  photos: Record<string, Photo[]>;
  loosePhotos: Record<string, Photo[]>;
  personas: Record<string, Persona[]>;
  removalRequests: Record<string, RemovalRequest[]>;
  recuerdos: Record<string, Recuerdo[]>;
  chapterRecuerdos: Record<string, Recuerdo[]>;
  baulRecuerdos: Record<string, Recuerdo[]>;
  isLoading: boolean;

  setAuthenticated: (value: boolean) => void;
  setSubscription: (subscription: Subscription | ((prev: Subscription) => Subscription)) => void;
  reset: () => void;

  fetchData: () => Promise<void>;
  loadChapters: (baulId: string) => Promise<void>;
  loadChapterPhotos: (chapterId: string) => Promise<void>;
  loadLoosePhotos: (baulId: string) => Promise<void>;
  loadRecuerdos: (photoId: string) => Promise<void>;
  addRecuerdo: (baulId: string, photoId: string, text: string) => Promise<void>;
  loadChapterRecuerdos: (baulId: string, chapterId: string) => Promise<void>;
  addChapterRecuerdo: (baulId: string, chapterId: string, text: string) => Promise<void>;
  loadBaulRecuerdos: (baulId: string) => Promise<void>;
  addBaulRecuerdo: (baulId: string, text: string) => Promise<void>;

  createBaul: (name: string, description: string) => Promise<Baul>;
  createChapter: (baulId: string, name: string) => Promise<Chapter>;
  uploadPhotos: (
    baulId: string,
    chapterId: string,
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
  ) => Promise<{ results: UploadItemResult[]; chapterId: string | null }>;
  movePhotos: (
    baulId: string,
    sourceChapterId: string | null,
    photoIds: string[],
    targetChapterId: string,
    onItemSettled?: (result: { photoId: string; error?: string }) => void
  ) => Promise<void>;
  deletePhoto: (baulId: string, chapterId: string | null, photoId: string, reason?: string) => Promise<void>;
  changePhotoDate: (baulId: string, chapterId: string | null, photoId: string, date: PhotoDate) => Promise<void>;
  changePhotoDateBatch: (baulId: string, chapterId: string | null, photoIds: string[], date: PhotoDate) => Promise<void>;
  setBaulCover: (baulId: string, photoId: string, optimisticThumbnailUrl?: string) => Promise<void>;
  setChapterCover: (baulId: string, chapterId: string, photoId: string, optimisticThumbnailUrl?: string) => Promise<void>;
  renameBaul: (baulId: string, name: string, description?: string) => Promise<void>;
  renameChapter: (baulId: string, chapterId: string, name: string) => Promise<void>;
  deleteChapter: (baulId: string, chapterId: string) => Promise<void>;

  createPersona: (baulId: string, nickname: string) => Promise<void>;
  loadPersonas: (baulId: string) => Promise<void>;
  updatePersona: (baulId: string, personaId: string, name: string, nickname: string) => Promise<void>;
  uploadPersonaAvatar: (baulId: string, personaId: string, file: File) => Promise<void>;
  updateUserRole: (baulId: string, personaId: string, role: BaulRole) => Promise<void>;
  revokeAccess: (baulId: string, personaId: string) => Promise<void>;

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
  chapters: {},
  photos: {},
  loosePhotos: {},
  personas: {},
  removalRequests: {},
  recuerdos: {},
  chapterRecuerdos: {},
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
    chapters: {},
    photos: {},
    loosePhotos: {},
    personas: {},
    removalRequests: {},
    recuerdos: {},
    chapterRecuerdos: {},
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

  loadChapters: async (baulId) => {
    const chapters = await api.chapters.getAll(baulId);
    set((state) => ({ chapters: { ...state.chapters, [baulId]: chapters } }));

    try {
      const personas = await api.baules.getPersonas(baulId);
      set((state) => ({ personas: { ...state.personas, [baulId]: personas } }));
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

  loadChapterPhotos: async (chapterId) => {
    const photos = await api.photos.getAll(chapterId);
    set((state) => ({ photos: { ...state.photos, [chapterId]: photos } }));
  },

  loadLoosePhotos: async (baulId) => {
    const photos = await api.baules.getLoosePhotos(baulId);
    set((state) => ({ loosePhotos: { ...state.loosePhotos, [baulId]: photos } }));
  },

  loadRecuerdos: async (photoId) => {
    const recuerdos = await api.recuerdos.getAll(photoId);
    set((state) => ({ recuerdos: { ...state.recuerdos, [photoId]: recuerdos } }));
  },

  addRecuerdo: async (baulId, photoId, text) => {
    const recuerdo = await api.recuerdos.create(photoId, text);
    set((state) => ({
      recuerdos: { ...state.recuerdos, [photoId]: [...(state.recuerdos[photoId] || []), recuerdo] },
      // Keeps the baúl-wide "Recuerdos" tab in sync — otherwise it stays stale until
      // BaulRoute is remounted, since its own load is guarded by "already have a cached
      // value for this baulId" (see BaulRoute.tsx). Only patches it when already loaded:
      // creating a one-item stub here would make that guard think it's fully loaded.
      baulRecuerdos: state.baulRecuerdos[baulId]
        ? { ...state.baulRecuerdos, [baulId]: [recuerdo, ...state.baulRecuerdos[baulId]] }
        : state.baulRecuerdos,
    }));
  },

  loadChapterRecuerdos: async (baulId, chapterId) => {
    const recuerdos = await api.recuerdos.getAllByChapter(baulId, chapterId);
    set((state) => ({ chapterRecuerdos: { ...state.chapterRecuerdos, [chapterId]: recuerdos } }));
  },

  addChapterRecuerdo: async (baulId, chapterId, text) => {
    const recuerdo = await api.recuerdos.createForChapter(baulId, chapterId, text);
    set((state) => ({
      chapterRecuerdos: { ...state.chapterRecuerdos, [chapterId]: [recuerdo, ...(state.chapterRecuerdos[chapterId] || [])] },
      // Same reasoning as addRecuerdo above — keep the baúl-wide tab's cache in sync too.
      baulRecuerdos: state.baulRecuerdos[baulId]
        ? { ...state.baulRecuerdos, [baulId]: [recuerdo, ...state.baulRecuerdos[baulId]] }
        : state.baulRecuerdos,
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

  createChapter: async (baulId, name) => {
    const chapter = await api.chapters.create(baulId, name);
    set((state) => ({
      chapters: { ...state.chapters, [baulId]: [...(state.chapters[baulId] || []), chapter] },
      baules: state.baules.map((b) => (b.id === baulId ? { ...b, chapterCount: b.chapterCount + 1 } : b)),
    }));
    return chapter;
  },

  uploadPhotos: async (baulId, chapterId, selectedPhotos, onItemSettled) => {
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
        const photo = await api.photos.upload(chapterId, selected.file, selected.clientUploadId, selected.date);
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
      // Re-fetch the chapter's full photo list from the server rather than appending
      // client-side — the chapter may not have been loaded into the store yet (e.g.
      // uploading via the native share flow into a chapter never opened this session),
      // and an append onto an empty/stale slice would silently drop its existing photos.
      // Mirrors the same fix already applied in movePhotos.
      const photosForChapter = await api.photos.getAll(chapterId);
      set((state) => ({
        photos: { ...state.photos, [chapterId]: photosForChapter },
        chapters: {
          ...state.chapters,
          [baulId]: (state.chapters[baulId] || []).map((a) =>
            a.id === chapterId
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
        const photo = await api.baules.uploadPhoto(baulId, selected.file, selected.clientUploadId, selected.date);
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
    let targetChapterId: string | null = chapter.type === 'existing' ? chapter.chapterId : null;

    if (chapter.type === 'new') {
      try {
        const newChapter = await get().createChapter(baulId, chapter.name);
        targetChapterId = newChapter.id;
      } catch (error) {
        Sentry.captureException(error);
        const message = error instanceof Error ? error.message : 'No se pudo crear el capítulo';
        const results = selectedPhotos.map((p) => {
          const result: UploadItemResult = { clientUploadId: p.clientUploadId, error: message };
          onItemSettled?.(result);
          return result;
        });
        return { results, chapterId: null };
      }
    }

    const results = targetChapterId
      ? await get().uploadPhotos(baulId, targetChapterId, selectedPhotos, onItemSettled)
      : await get().uploadLoosePhotos(baulId, selectedPhotos, onItemSettled);

    return { results, chapterId: targetChapterId };
  },

  // Cada foto se mueve con su propia petición y su propio try/catch — igual que
  // uploadPhotos — para que un fallo a mitad de lote no aborte el resto ni deje el
  // store desincronizado con lo que sí se movió server-side (bug real: la versión
  // anterior lanzaba en el primer fallo sin haber reconciliado nada). Si hay algún
  // fallo se lanza al final, tras reconciliar los que sí tuvieron éxito, para que el
  // toast de error del caller siga disparándose.
  movePhotos: async (baulId, sourceChapterId, photoIds, targetChapterId, onItemSettled) => {
    const succeededIds: string[] = [];
    let failedCount = 0;
    for (const photoId of photoIds) {
      try {
        await api.photos.move(photoId, targetChapterId);
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

    // Re-fetch the target chapter's photos from the server rather than merging
    // client-side — the target may not have been loaded into the store yet
    // (e.g. moving into a chapter the user hasn't opened this session), and a
    // client-side merge against an empty/stale slice would silently drop its
    // existing photos.
    const targetPhotos = await api.photos.getAll(targetChapterId);

    set((state) => {
      // sourceChapterId is null when moving out of the "Fotos sueltas" virtual chapter.
      const sourcePhotos = sourceChapterId ? (state.photos[sourceChapterId] || []) : (state.loosePhotos[baulId] || []);
      const movedCount = sourcePhotos.filter((p) => succeededIds.includes(p.id)).length;
      const remainingSourcePhotos = sourcePhotos.filter((p) => !succeededIds.includes(p.id));

      return {
        photos: {
          ...state.photos,
          ...(sourceChapterId ? { [sourceChapterId]: remainingSourcePhotos } : {}),
          [targetChapterId]: targetPhotos,
        },
        loosePhotos: sourceChapterId
          ? state.loosePhotos
          : { ...state.loosePhotos, [baulId]: remainingSourcePhotos },
        chapters: {
          ...state.chapters,
          [baulId]: (state.chapters[baulId] || []).map((a) => {
            if (sourceChapterId && a.id === sourceChapterId) return { ...a, photoCount: Math.max(0, a.photoCount - movedCount) };
            if (a.id === targetChapterId) {
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

  deletePhoto: async (baulId, chapterId, photoId, reason) => {
    await api.photos.delete(photoId, reason);

    set((state) => (chapterId
      ? { photos: { ...state.photos, [chapterId]: (state.photos[chapterId] || []).filter((p) => p.id !== photoId) } }
      : { loosePhotos: { ...state.loosePhotos, [baulId]: (state.loosePhotos[baulId] || []).filter((p) => p.id !== photoId) } }
    ));

    if (chapterId) {
      const chapters = await api.chapters.getAll(baulId);
      set((state) => ({ chapters: { ...state.chapters, [baulId]: chapters } }));
    }
  },

  changePhotoDate: async (baulId, chapterId, photoId, date) => {
    const updated = await api.photos.changeDate(photoId, date);
    set((state) => (chapterId
      ? { photos: { ...state.photos, [chapterId]: (state.photos[chapterId] || []).map((p) => (p.id === photoId ? updated : p)) } }
      : { loosePhotos: { ...state.loosePhotos, [baulId]: (state.loosePhotos[baulId] || []).map((p) => (p.id === photoId ? updated : p)) } }
    ));

    const chapters = await api.chapters.getAll(baulId);
    set((state) => ({ chapters: { ...state.chapters, [baulId]: chapters } }));
  },

  changePhotoDateBatch: async (baulId, chapterId, photoIds, date) => {
    const updated = await api.photos.changeDateBatch(photoIds, date);
    const updatedById = new Map(updated.map((p) => [p.id, p]));
    set((state) => (chapterId
      ? { photos: { ...state.photos, [chapterId]: (state.photos[chapterId] || []).map((p) => updatedById.get(p.id) || p) } }
      : { loosePhotos: { ...state.loosePhotos, [baulId]: (state.loosePhotos[baulId] || []).map((p) => updatedById.get(p.id) || p) } }
    ));

    const chapters = await api.chapters.getAll(baulId);
    set((state) => ({ chapters: { ...state.chapters, [baulId]: chapters } }));
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

  setChapterCover: async (baulId, chapterId, photoId, optimisticThumbnailUrl) => {
    const previous = get().chapters[baulId] || [];
    if (optimisticThumbnailUrl) {
      set((state) => ({
        chapters: {
          ...state.chapters,
          [baulId]: previous.map((a) => (a.id === chapterId ? { ...a, coverPhotoUrl: optimisticThumbnailUrl } : a)),
        },
      }));
    }
    try {
      const updated = await api.chapters.setCover(baulId, chapterId, photoId);
      set((state) => ({
        chapters: {
          ...state.chapters,
          [baulId]: (state.chapters[baulId] || []).map((a) => (a.id === chapterId ? updated : a)),
        },
      }));
    } catch (error) {
      set((state) => ({ chapters: { ...state.chapters, [baulId]: previous } }));
      throw error;
    }
  },

  renameBaul: async (baulId, name, description) => {
    const updated = await api.baules.update(baulId, name, description);
    set((state) => ({
      baules: state.baules.map((b) => (b.id === baulId ? updated : b)),
    }));
  },

  renameChapter: async (baulId, chapterId, name) => {
    const updated = await api.chapters.update(baulId, chapterId, name);
    set((state) => ({
      chapters: {
        ...state.chapters,
        [baulId]: (state.chapters[baulId] || []).map((a) => (a.id === chapterId ? updated : a)),
      },
    }));
  },

  deleteChapter: async (baulId, chapterId) => {
    await api.chapters.delete(baulId, chapterId);

    set((state) => {
      const { [chapterId]: _removedPhotos, ...restPhotos } = state.photos;
      const { [chapterId]: _removedRecuerdos, ...restChapterRecuerdos } = state.chapterRecuerdos;
      return {
        chapters: { ...state.chapters, [baulId]: (state.chapters[baulId] || []).filter((a) => a.id !== chapterId) },
        photos: restPhotos,
        chapterRecuerdos: restChapterRecuerdos,
      };
    });

    const [loosePhotos, baulRecuerdos] = await Promise.all([
      api.baules.getLoosePhotos(baulId),
      api.recuerdos.getAllByBaul(baulId),
    ]);
    set((state) => ({
      loosePhotos: { ...state.loosePhotos, [baulId]: loosePhotos },
      baulRecuerdos: { ...state.baulRecuerdos, [baulId]: baulRecuerdos },
    }));
  },

  createPersona: async (baulId, nickname) => {
    const persona = await api.baules.createPersona(baulId, nickname);
    set((state) => ({
      personas: { ...state.personas, [baulId]: [...(state.personas[baulId] || []), persona] },
    }));
  },

  loadPersonas: async (baulId) => {
    const personas = await api.baules.getPersonas(baulId);
    set((state) => ({ personas: { ...state.personas, [baulId]: personas } }));
  },

  updatePersona: async (baulId, personaId, name, nickname) => {
    const updated = await api.baules.updatePersona(baulId, personaId, name, nickname);
    set((state) => ({
      personas: {
        ...state.personas,
        [baulId]: (state.personas[baulId] || []).map((u) => (u.id === personaId ? updated : u)),
      },
    }));
  },

  uploadPersonaAvatar: async (baulId, personaId, file) => {
    const updated = await api.baules.uploadPersonaAvatar(baulId, personaId, file);
    set((state) => ({
      personas: {
        ...state.personas,
        [baulId]: (state.personas[baulId] || []).map((u) => (u.id === personaId ? updated : u)),
      },
    }));
  },

  // Optimista: el <select> de rol está controlado por este valor, así que sin aplicar
  // el cambio antes del await se ve "rebotar" al valor anterior mientras se espera al
  // servidor. Si la petición falla, se revierte al snapshot previo.
  updateUserRole: async (baulId, personaId, role) => {
    const previous = get().personas[baulId] || [];
    set((state) => ({
      personas: {
        ...state.personas,
        [baulId]: previous.map((u) => (u.id === personaId ? { ...u, role } : u)),
      },
    }));
    try {
      await api.baules.updatePersonaRole(baulId, personaId, role);
    } catch (error) {
      set((state) => ({ personas: { ...state.personas, [baulId]: previous } }));
      throw error;
    }
  },

  revokeAccess: async (baulId, personaId) => {
    await api.baules.revokeAccess(baulId, personaId);
    set((state) => ({
      personas: {
        ...state.personas,
        [baulId]: (state.personas[baulId] || []).filter((u) => u.id !== personaId),
      },
    }));
  },

  removePhoto: async (baulId, requestId, photoId) => {
    await api.baules.approveRemovalRequest(baulId, requestId);
    set((state) => {
      const photos = { ...state.photos };
      for (const chapterId of Object.keys(photos)) {
        photos[chapterId] = photos[chapterId].filter((p) => p.id !== photoId);
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
