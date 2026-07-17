import { create } from 'zustand';
import { Baul, Album, Photo, SharedUser, RemovalRequest, Activity, BaulRole, Recuerdo, Subscription, UserProfile } from '@/types';
import { api } from '@/api';

const defaultSubscription: Subscription = {
  currentPlan: 'gratuito',
  baulesUsed: 0,
  baulesLimit: 2,
  storagePerBaulGB: 10,
};

interface AppState {
  // Auth-derived state. The raw access token itself lives only in api.ts.
  isAuthenticated: boolean;
  userProfile: { photoUrl: string; name: string; email: string };
  subscription: Subscription;

  // Domain data
  baules: Baul[];
  albums: Record<string, Album[]>;
  photos: Record<string, Photo[]>;
  sharedUsers: Record<string, SharedUser[]>;
  removalRequests: Record<string, RemovalRequest[]>;
  recuerdos: Record<string, Recuerdo[]>;
  activities: Activity[];
  isLoading: boolean;
  error: string | null;

  setAuthenticated: (value: boolean) => void;
  setSubscription: (subscription: Subscription | ((prev: Subscription) => Subscription)) => void;
  reset: () => void;

  fetchData: () => Promise<void>;
  loadAlbums: (baulId: string) => Promise<void>;
  loadAlbumPhotos: (albumId: string) => Promise<void>;
  loadRecuerdos: (photoId: string) => Promise<void>;
  addRecuerdo: (photoId: string, text: string) => Promise<void>;

  createBaul: (name: string, description: string) => Promise<Baul>;
  createAlbum: (baulId: string, name: string, description: string) => Promise<Album>;
  uploadPhotos: (baulId: string, albumId: string, selectedPhotos: { file: File; caption?: string; date?: string }[]) => Promise<void>;

  sendInvitation: (baulId: string, email: string, role: BaulRole) => Promise<void>;
  updateUserRole: (baulId: string, sharedUserId: string, role: BaulRole) => Promise<void>;
  revokeAccess: (baulId: string, email: string) => Promise<void>;

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
  sharedUsers: {},
  removalRequests: {},
  recuerdos: {},
  activities: [],
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
    sharedUsers: {},
    removalRequests: {},
    recuerdos: {},
    activities: [],
  }),

  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [baules, activities, profile] = await Promise.all([
        api.baules.getAll(),
        api.activities.getAll(),
        loadProfile(),
      ]);

      set({
        baules,
        activities,
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
    if (baul?.isCustodio) {
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

  uploadPhotos: async (baulId, albumId, selectedPhotos) => {
    const uploaded: Photo[] = [];
    for (const selected of selectedPhotos) {
      uploaded.push(await api.photos.upload(albumId, selected.file, selected.caption, selected.date));
    }

    set((state) => ({
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
    }));
  },

  sendInvitation: async (baulId, email, role) => {
    const invitation = await api.baules.share(baulId, email, role);
    set((state) => ({
      sharedUsers: { ...state.sharedUsers, [baulId]: [...(state.sharedUsers[baulId] || []), invitation] },
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

  revokeAccess: async (baulId, email) => {
    await api.baules.revokeAccess(baulId, email);
    set((state) => ({
      sharedUsers: {
        ...state.sharedUsers,
        [baulId]: (state.sharedUsers[baulId] || []).filter((u) => u.email !== email),
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

      return {
        photos,
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
