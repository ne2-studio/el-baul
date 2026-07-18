import { create } from 'zustand';
import * as Sentry from '@sentry/react';
import { Baul, Album, Photo, SharedUser, RemovalRequest, BaulRole, Recuerdo, Subscription, UserProfile, PhotoDate } from '@/types';
import { api } from '@/api';
import { isAdminRole } from '@/utils/roleUtils';

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
  date?: string;
}

export interface UploadItemResult {
  clientUploadId: string;
  photo?: Photo;
  error?: string;
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
  isLoading: boolean;
  error: string | null;

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
  movePhotos: (baulId: string, sourceAlbumId: string | null, photoIds: string[], targetAlbumId: string) => Promise<void>;
  deletePhoto: (baulId: string, albumId: string | null, photoId: string, reason?: string) => Promise<void>;
  changePhotoDate: (baulId: string, albumId: string | null, photoId: string, date: PhotoDate) => Promise<void>;
  changePhotoDateBatch: (baulId: string, albumId: string | null, photoIds: string[], date: PhotoDate) => Promise<void>;
  setBaulCover: (baulId: string, photoId: string) => Promise<void>;
  setAlbumCover: (baulId: string, albumId: string, photoId: string) => Promise<void>;
  renameBaul: (baulId: string, name: string, description?: string) => Promise<void>;
  renameAlbum: (baulId: string, albumId: string, name: string, description?: string) => Promise<void>;

  createPersona: (baulId: string, nickname: string) => Promise<void>;
  updateUserRole: (baulId: string, sharedUserId: string, role: BaulRole) => Promise<void>;
  revokeAccess: (baulId: string, sharedUserId: string) => Promise<void>;

  removePhoto: (baulId: string, requestId: string, photoId: string) => Promise<void>;
  keepPhoto: (baulId: string, requestId: string) => Promise<void>;
  submitRemovalRequest: (baulId: string, photo: Photo, reason: string) => Promise<void>;
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
  isLoading: true,
  error: null,

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
  }),

  fetchData: async () => {
    set({ isLoading: true, error: null });
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
      set({ error: (error as Error).message, isLoading: false });
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

  createBaul: async (name, description) => {
    const baul = await api.baules.create(name, description);
    set((state) => ({ baules: [...state.baules, baul] }));
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
        const photo = await api.photos.upload(albumId, selected.file, selected.clientUploadId, selected.caption, selected.date);
        uploaded.push(photo);
        result = { clientUploadId: selected.clientUploadId, photo };
      } catch (error) {
        Sentry.captureException(error);
        result = { clientUploadId: selected.clientUploadId, error: error instanceof Error ? error.message : 'Upload failed' };
      }
      results.push(result);
      onItemSettled?.(result);
    }

    if (uploaded.length > 0) set((state) => ({
      photos: { ...state.photos, [albumId]: [...(state.photos[albumId] || []), ...uploaded] },
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

    return results;
  },

  uploadLoosePhotos: async (baulId, selectedPhotos, onItemSettled) => {
    const uploaded: Photo[] = [];
    const results: UploadItemResult[] = [];
    for (const selected of selectedPhotos) {
      let result: UploadItemResult;
      try {
        const photo = await api.baules.uploadPhoto(baulId, selected.file, selected.clientUploadId, selected.caption, selected.date);
        uploaded.push(photo);
        result = { clientUploadId: selected.clientUploadId, photo };
      } catch (error) {
        Sentry.captureException(error);
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

  movePhotos: async (baulId, sourceAlbumId, photoIds, targetAlbumId) => {
    for (const photoId of photoIds) {
      await api.photos.move(photoId, targetAlbumId);
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
      const movedCount = sourcePhotos.filter((p) => photoIds.includes(p.id)).length;
      const remainingSourcePhotos = sourcePhotos.filter((p) => !photoIds.includes(p.id));

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

  setBaulCover: async (baulId, photoId) => {
    const updated = await api.baules.setCover(baulId, photoId);
    set((state) => ({
      baules: state.baules.map((b) => (b.id === baulId ? updated : b)),
    }));
  },

  setAlbumCover: async (baulId, albumId, photoId) => {
    const updated = await api.albums.setCover(baulId, albumId, photoId);
    set((state) => ({
      albums: {
        ...state.albums,
        [baulId]: (state.albums[baulId] || []).map((a) => (a.id === albumId ? updated : a)),
      },
    }));
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

  updateUserRole: async (baulId, sharedUserId, role) => {
    await api.baules.updateSharedUserRole(baulId, sharedUserId, role);
    set((state) => ({
      sharedUsers: {
        ...state.sharedUsers,
        [baulId]: (state.sharedUsers[baulId] || []).map((u) => (u.id === sharedUserId ? { ...u, role } : u)),
      },
    }));
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
