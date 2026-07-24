import { create } from 'zustand';
import { Persona, RemovalRequest, BaulRole } from '@/types';
import { api } from '@/api';
import { useBaulesStore } from './useBaulesStore';

export interface PersonasState {
  personas: Record<string, Persona[]>;
  removalRequests: Record<string, RemovalRequest[]>;

  reset: () => void;

  createPersona: (baulId: string, nickname: string) => Promise<void>;
  loadPersonas: (baulId: string) => Promise<void>;
  updatePersona: (baulId: string, personaId: string, name: string, nickname: string) => Promise<void>;
  uploadPersonaAvatar: (baulId: string, personaId: string, file: File) => Promise<void>;
  updateUserRole: (baulId: string, personaId: string, role: BaulRole) => Promise<void>;
  revokeAccess: (baulId: string, personaId: string) => Promise<void>;

  loadRemovalRequests: (baulId: string) => Promise<void>;
  removePhoto: (baulId: string, requestId: string, photoId: string) => Promise<void>;
  keepPhoto: (baulId: string, requestId: string) => Promise<void>;
  // Solo se usa photo.id — se acepta cualquier objeto con id para no acoplar esta acción
  // al tipo Photo concreto de cada pantalla (PhotoViewer usa su propia interfaz local).
  submitRemovalRequest: (baulId: string, photo: { id: string }, reason: string) => Promise<void>;
}

export const usePersonasStore = create<PersonasState>((set, get) => ({
  personas: {},
  removalRequests: {},

  reset: () => set({
    personas: {},
    removalRequests: {},
  }),

  createPersona: async (baulId, nickname) => {
    const persona = await api.baules.createPersona(baulId, nickname);
    set((state) => ({
      personas: { ...state.personas, [baulId]: [...(state.personas[baulId] || []), persona] },
    }));
  },

  loadPersonas: async (baulId) => {
    try {
      const personas = await api.baules.getPersonas(baulId);
      set((state) => ({ personas: { ...state.personas, [baulId]: personas } }));
    } catch (err) {
      console.log('No shared users or error loading:', err);
    }
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

  loadRemovalRequests: async (baulId) => {
    try {
      const removalRequests = await api.baules.getRemovalRequests(baulId);
      set((state) => ({ removalRequests: { ...state.removalRequests, [baulId]: removalRequests } }));
    } catch (err) {
      console.log('No removal requests or error loading:', err);
    }
  },

  removePhoto: async (baulId, requestId, photoId) => {
    await api.baules.approveRemovalRequest(baulId, requestId);
    useBaulesStore.getState().removePhotoFromCaches(photoId);
    set((state) => ({
      removalRequests: {
        ...state.removalRequests,
        [baulId]: (state.removalRequests[baulId] || []).filter((r) => r.id !== requestId),
      },
    }));
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
