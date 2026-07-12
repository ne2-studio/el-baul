import { create } from 'zustand';
import {Baul, Album, Photo, SharedUser, AccessRequest, RemovalRequest, ActivityItem, BaulRole, Recuerdo} from '@/types';
import { getBaules, createBaul } from '../services/baules.service';
import { getActivities } from '../services/activity.service';
import { getAlbums, createAlbum } from '../services/albums.service';
import { getSharedUsers, shareBaul, updateUserRole, revokeAccess } from '../services/sharing.service';
import { getPhotos, uploadPhoto } from '../services/photos.service';
import { getRecuerdos, createRecuerdo } from '../services/recuerdos.service';
import { getAccessRequests, getRemovalRequests, approveAccessRequest, rejectAccessRequest, submitAccessRequest, approveRemovalRequest, rejectRemovalRequest, submitRemovalRequest } from '../services/requests.service';
import { formatRelativeTime } from '../utils/timeUtils';

interface DataState {
  baules: Baul[];
  albums: Record<string, Album[]>;
  photos: Record<string, Photo[]>;
  sharedUsers: Record<string, SharedUser[]>;
  accessRequests: Record<string, AccessRequest[]>;
  removalRequests: Record<string, RemovalRequest[]>;
  recuerdos: Record<string, Recuerdo[]>;
  activities: ActivityItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setBaules: (baules: Baul[]) => void;
  loadUserData: (token: string) => Promise<void>;
  loadAlbums: (token: string, baulId: string) => Promise<void>;
  loadAlbumPhotos: (token: string, albumId: string) => Promise<void>;
  loadRecuerdos: (token: string, photoId: string) => Promise<void>;
  addRecuerdo: (token: string, photoId: string, text: string) => Promise<void>;
  addBaul: (baul: Baul) => void;
  addAlbum: (baulId: string, album: Album) => void;
  addPhotos: (albumId: string, photos: Photo[]) => void;
  updateBaulAlbumCount: (baulId: string, increment: number) => void;
  updateAlbumPhotoCount: (baulId: string, albumId: string, increment: number) => void;
  
  // New Business Actions
  createBaul: (token: string, name: string, description: string) => Promise<Baul>;
  createAlbum: (token: string, baulId: string, name: string, description: string) => Promise<Album>;
  uploadPhotos: (token: string, baulId: string, albumId: string, selectedPhotos: any[]) => Promise<void>;
  
  // Sharing Actions
  sendInvitation: (token: string, baulId: string, email: string, role: BaulRole) => Promise<void>;
  updateUserRole: (token: string, baulId: string, userId: string, role: BaulRole) => Promise<void>;
  revokeAccess: (token: string, baulId: string, userId: string) => Promise<void>;
  approveAccessRequest: (token: string, baulId: string, requestId: string) => Promise<void>;
  rejectAccessRequest: (token: string, baulId: string, requestId: string) => Promise<void>;
  
  // Removal Actions
  removePhoto: (token: string, baulId: string, requestId: string, photoId: string) => Promise<void>;
  keepPhoto: (token: string, baulId: string, requestId: string) => Promise<void>;
  submitAccessRequest: (token: string, baulId: string, message: string) => Promise<void>;
  submitRemovalRequest: (token: string, baulId: string, photo: Photo, reason: string) => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  baules: [],
  albums: {},
  photos: {},
  sharedUsers: {},
  accessRequests: {},
  removalRequests: {},
  recuerdos: {},
  activities: [],
  isLoading: false,
  error: null,

  setBaules: (baules) => set({ baules }),

  loadUserData: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const baulesData = await getBaules(token);
      const formattedBaules = baulesData.map((baul: any) => ({
        ...baul,
        lastUpdated: formatRelativeTime(baul.updatedAt),
        sharedCount: baul.sharedCount || 0
      }));
      
      const activitiesData = await getActivities(token);
      
      set({ 
        baules: formattedBaules, 
        activities: activitiesData,
        isLoading: false 
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  loadAlbums: async (token: string, baulId: string) => {
    try {
      const albumsData = await getAlbums(token, baulId);
      const formattedAlbums = albumsData.map((album: any) => ({
        ...album,
        lastUpdated: formatRelativeTime(album.updatedAt)
      }));
      
      set((state) => ({
        albums: {
          ...state.albums,
          [baulId]: formattedAlbums
        }
      }));

      // Load shared users
      try {
        const sharedUsersData = await getSharedUsers(token, baulId);
        const formattedSharedUsers = sharedUsersData.map((user: any) => ({
          ...user,
          invitedDate: formatRelativeTime(user.invitedDate)
        }));
        set((state) => ({
          sharedUsers: { ...state.sharedUsers, [baulId]: formattedSharedUsers }
        }));
      } catch (err) {
        console.log('No shared users or error loading:', err);
      }

      // Also load access requests if applicable
      const baul = get().baules.find(b => b.id === baulId);
      if (baul?.isCustodio) {
        // Load access requests
        try {
          const requestsData = await getAccessRequests(token, baulId);
          const formattedRequests = requestsData.map((req: any) => ({
            ...req,
            requestDate: formatRelativeTime(req.requestDate)
          }));
          set((state) => ({
            accessRequests: { ...state.accessRequests, [baulId]: formattedRequests }
          }));
        } catch (err) {
          console.log('No access requests or error loading:', err);
        }

        // Load removal requests
        try {
          const removalRequestsData = await getRemovalRequests(token, baulId);
          const formattedRemovalRequests = removalRequestsData.map((req: any) => ({
            ...req,
            requestDate: formatRelativeTime(req.requestDate)
          }));
          set((state) => ({
            removalRequests: { ...state.removalRequests, [baulId]: formattedRemovalRequests }
          }));
        } catch (err) {
          console.log('No removal requests or error loading:', err);
        }
      }
    } catch (error) {
      console.error('Error loading albums:', error);
      throw error;
    }
  },

  loadAlbumPhotos: async (token: string, albumId: string) => {
    try {
      const photosData = await getPhotos(token, albumId);
      set((state) => ({
        photos: {
          ...state.photos,
          [albumId]: photosData
        }
      }));
    } catch (error) {
      console.error('Error loading photos:', error);
      throw error;
    }
  },

  loadRecuerdos: async (token: string, photoId: string) => {
    try {
      const recuerdosData = await getRecuerdos(token, photoId);
      // Ensure data structure matches Recuerdo interface
      const formattedRecuerdos = recuerdosData.map((r: any) => ({
        ...r,
        userName: r.userName || r.user_name || r.user?.name || 'Usuario desconocido',
        userAvatar: r.userAvatar || r.user_avatar || r.user?.avatar
      }));
      set((state) => ({
        recuerdos: {
          ...state.recuerdos,
          [photoId]: formattedRecuerdos
        }
      }));
    } catch (error) {
      console.error('Error loading recuerdos:', error);
      throw error;
    }
  },

  addRecuerdo: async (token: string, photoId: string, text: string) => {
    try {
      const newRecuerdo = await createRecuerdo(token, photoId, text);
      const formattedRecuerdo: Recuerdo = {
        ...newRecuerdo,
        userName: newRecuerdo.userName || 'Yo',
        userAvatar: newRecuerdo.userAvatar,
        isOwn: true
      };
      set((state) => ({
        recuerdos: {
          ...state.recuerdos,
          [photoId]: [...(state.recuerdos[photoId] || []), formattedRecuerdo]
        }
      }));
    } catch (error) {
      console.error('Error adding recuerdo:', error);
      throw error;
    }
  },

  addBaul: (baul) => set((state) => ({ baules: [...state.baules, baul] })),

  addAlbum: (baulId, album) => set((state) => ({
    albums: {
      ...state.albums,
      [baulId]: [...(state.albums[baulId] || []), album]
    }
  })),

  addPhotos: (albumId, photos) => set((state) => ({
    photos: {
      ...state.photos,
      [albumId]: [...(state.photos[albumId] || []), ...photos]
    }
  })),

  updateBaulAlbumCount: (baulId, increment) => set((state) => ({
    baules: state.baules.map(b => 
      b.id === baulId 
        ? { ...b, albumCount: b.albumCount + increment, lastUpdated: 'ahora' } 
        : b
    )
  })),

  updateAlbumPhotoCount: (baulId, albumId, increment) => set((state) => ({
    albums: {
      ...state.albums,
      [baulId]: (state.albums[baulId] || []).map(a =>
        a.id === albumId
          ? { ...a, photoCount: a.photoCount + increment }
          : a
      )
    }
  })),

  createBaul: async (token, name, description) => {
    try {
      const newBaul = await createBaul(token, name, description);
      const formattedBaul: Baul = {
        ...newBaul,
        lastUpdated: 'ahora',
        isCustodio: true,
        sharedCount: 0
      };
      
      set((state) => ({ baules: [...state.baules, formattedBaul] }));
      return formattedBaul;
    } catch (error) {
      console.error('Error in createBaul action:', error);
      throw error;
    }
  },

  createAlbum: async (token, baulId, name, description) => {
    try {
      const newAlbum = await createAlbum(token, baulId, name, description);
      const formattedAlbum: Album = {
        ...newAlbum,
        lastUpdated: 'ahora'
      };
      
      set((state) => ({
        albums: {
          ...state.albums,
          [baulId]: [...(state.albums[baulId] || []), formattedAlbum]
        }
      }));
      
      // Update baul album count
      get().updateBaulAlbumCount(baulId, 1);
      
      return formattedAlbum;
    } catch (error) {
      console.error('Error in createAlbum action:', error);
      throw error;
    }
  },

  uploadPhotos: async (token, baulId, albumId, selectedPhotos) => {
    try {
      const uploadedPhotos: Photo[] = [];
      
      for (const selectedPhoto of selectedPhotos) {
        const photo = await uploadPhoto(
          token,
          albumId,
          selectedPhoto.file,
          selectedPhoto.caption || '',
          selectedPhoto.date || new Date().toISOString()
        );
        uploadedPhotos.push(photo);
      }
      
      set((state) => ({
        photos: {
          ...state.photos,
          [albumId]: [...(state.photos[albumId] || []), ...uploadedPhotos]
        }
      }));
      
      // Update album photo count
      get().updateAlbumPhotoCount(baulId, albumId, uploadedPhotos.length);
    } catch (error) {
      console.error('Error in uploadPhotos action:', error);
      throw error;
    }
  },

  sendInvitation: async (token, baulId, email, role) => {
    try {
      const invitation = await shareBaul(token, baulId, email, role);
      const formattedInvitation: SharedUser = {
        ...invitation,
        invitedDate: 'ahora'
      };
      
      set((state) => ({
        sharedUsers: {
          ...state.sharedUsers,
          [baulId]: [...(state.sharedUsers[baulId] || []), formattedInvitation]
        }
      }));
    } catch (error) {
      console.error('Error in sendInvitation action:', error);
      throw error;
    }
  },

  updateUserRole: async (token, baulId, userId, role) => {
    try {
      await updateUserRole(token, baulId, userId, role);
      set((state) => ({
        sharedUsers: {
          ...state.sharedUsers,
          [baulId]: (state.sharedUsers[baulId] || []).map(u =>
            u.id === userId ? { ...u, role } : u
          )
        }
      }));
    } catch (error) {
      console.error('Error in updateUserRole action:', error);
      throw error;
    }
  },

  revokeAccess: async (token, baulId, userId) => {
    try {
      await revokeAccess(token, baulId, userId);
      set((state) => ({
        sharedUsers: {
          ...state.sharedUsers,
          [baulId]: (state.sharedUsers[baulId] || []).filter(u => u.id !== userId)
        }
      }));
    } catch (error) {
      console.error('Error in revokeAccess action:', error);
      throw error;
    }
  },

  approveAccessRequest: async (token, baulId, requestId) => {
    try {
      await approveAccessRequest(token, baulId, requestId);
      
      // Update store: remove request and refresh shared users
      const sharedUsersData = await getSharedUsers(token, baulId);
      const formattedSharedUsers = sharedUsersData.map((user: any) => ({
        ...user,
        invitedDate: formatRelativeTime(user.invitedDate)
      }));
      
      set((state) => ({
        accessRequests: {
          ...state.accessRequests,
          [baulId]: (state.accessRequests[baulId] || []).filter(r => r.id !== requestId)
        },
        sharedUsers: {
          ...state.sharedUsers,
          [baulId]: formattedSharedUsers
        }
      }));
    } catch (error) {
      console.error('Error in approveAccessRequest action:', error);
      throw error;
    }
  },

  rejectAccessRequest: async (token, baulId, requestId) => {
    try {
      await rejectAccessRequest(token, baulId, requestId);
      set((state) => ({
        accessRequests: {
          ...state.accessRequests,
          [baulId]: (state.accessRequests[baulId] || []).filter(r => r.id !== requestId)
        }
      }));
    } catch (error) {
      console.error('Error in rejectAccessRequest action:', error);
      throw error;
    }
  },

  removePhoto: async (token, baulId, requestId, photoId) => {
    try {
      await approveRemovalRequest(token, baulId, requestId);
      
      set((state) => {
        const newPhotos = { ...state.photos };
        Object.keys(newPhotos).forEach(albumId => {
          newPhotos[albumId] = newPhotos[albumId].filter(p => p.id !== photoId);
        });
        
        return {
          photos: newPhotos,
          removalRequests: {
            ...state.removalRequests,
            [baulId]: (state.removalRequests[baulId] || []).filter(r => r.id !== requestId)
          }
        };
      });
    } catch (error) {
      console.error('Error in removePhoto action:', error);
      throw error;
    }
  },

  keepPhoto: async (token, baulId, requestId) => {
    try {
      await rejectRemovalRequest(token, baulId, requestId);
      
      set((state) => ({
        removalRequests: {
          ...state.removalRequests,
          [baulId]: (state.removalRequests[baulId] || []).filter(r => r.id !== requestId)
        }
      }));
    } catch (error) {
      console.error('Error in keepPhoto action:', error);
      throw error;
    }
  },

  submitAccessRequest: async (token, baulId, message) => {
    try {
      await submitAccessRequest(token, baulId, message);
    } catch (error) {
      console.error('Error in submitAccessRequest action:', error);
      throw error;
    }
  },

  submitRemovalRequest: async (token, baulId, photo, reason) => {
    try {
      await submitRemovalRequest(
        token,
        baulId,
        photo.id,
        photo.url,
        photo.caption,
        reason
      );
    } catch (error) {
      console.error('Error in submitRemovalRequest action:', error);
      throw error;
    }
  }
}));
