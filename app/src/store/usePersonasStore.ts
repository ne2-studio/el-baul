import { create } from 'zustand';
import { Persona, RemovalRequest, BaulRole, Photo, TaggedPersona } from '@/types';
import { api } from '@/api';
import { useBaulesStore } from './useBaulesStore';

export interface PersonasState {
  personas: Record<string, Persona[]>;
  removalRequests: Record<string, RemovalRequest[]>;
  taggedPersonas: Record<string, TaggedPersona[]>; // keyed by photoId
  personaPhotos: Record<string, Photo[]>; // keyed by personaId

  reset: () => void;

  createPersona: (baulId: string, nickname: string) => Promise<void>;
  loadPersonas: (baulId: string) => Promise<void>;
  updatePersona: (baulId: string, personaId: string, name: string, nickname: string, biografia: string) => Promise<void>;
  uploadPersonaAvatar: (baulId: string, personaId: string, file: File) => Promise<void>;
  updateUserRole: (baulId: string, personaId: string, role: BaulRole) => Promise<void>;
  revokeAccess: (baulId: string, personaId: string) => Promise<void>;

  loadRemovalRequests: (baulId: string) => Promise<void>;
  removePhoto: (baulId: string, requestId: string, photoId: string) => Promise<void>;
  keepPhoto: (baulId: string, requestId: string) => Promise<void>;
  // Solo se usa photo.id — se acepta cualquier objeto con id para no acoplar esta acción
  // al tipo Photo concreto de cada pantalla (PhotoViewer usa su propia interfaz local).
  submitRemovalRequest: (baulId: string, photo: { id: string }, reason: string) => Promise<void>;

  loadTaggedPersonas: (photoId: string) => Promise<void>;
  setTaggedPersonas: (photoId: string, personaIds: string[]) => Promise<void>;
  loadPersonaPhotos: (baulId: string, personaId: string) => Promise<void>;
  addTaggedPersonasBatch: (baulId: string, photoIds: string[], personaIds: string[]) => Promise<void>;
}

export const usePersonasStore = create<PersonasState>((set, get) => ({
  personas: {},
  removalRequests: {},
  taggedPersonas: {},
  personaPhotos: {},

  reset: () => set({
    personas: {},
    removalRequests: {},
    taggedPersonas: {},
    personaPhotos: {},
  }),

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

  updatePersona: async (baulId, personaId, name, nickname, biografia) => {
    const updated = await api.baules.updatePersona(baulId, personaId, name, nickname, biografia);
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
        [baulId]: previous.map((u) => (
          u.id === personaId
            ? { ...u, role, status: u.status === 'sin_acceso' ? 'pending' : u.status }
            : u
        )),
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
        [baulId]: (state.personas[baulId] || []).map((persona) =>
          persona.id === personaId
            ? { ...persona, email: undefined, role: 'sin_acceso', status: 'sin_acceso' }
            : persona
        ),
      },
    }));
  },

  loadRemovalRequests: async (baulId) => {
    const removalRequests = await api.baules.getRemovalRequests(baulId);
    set((state) => ({ removalRequests: { ...state.removalRequests, [baulId]: removalRequests } }));
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

  loadTaggedPersonas: async (photoId) => {
    const taggedPersonas = await api.photos.getTaggedPersonas(photoId);
    set((state) => ({ taggedPersonas: { ...state.taggedPersonas, [photoId]: taggedPersonas } }));
  },

  setTaggedPersonas: async (photoId, personaIds) => {
    const taggedPersonas = await api.photos.setTaggedPersonas(photoId, personaIds);
    set((state) => ({ taggedPersonas: { ...state.taggedPersonas, [photoId]: taggedPersonas } }));
  },

  loadPersonaPhotos: async (baulId, personaId) => {
    const photos = await api.baules.getPersonaPhotos(baulId, personaId);
    set((state) => ({ personaPhotos: { ...state.personaPhotos, [personaId]: photos } }));
  },

  // No hay estado que actualizar: la cuadrícula de fotos no muestra chips de personas
  // etiquetadas (solo el visor de una foto lo hace, vía taggedPersonas).
  addTaggedPersonasBatch: async (baulId, photoIds, personaIds) => {
    await api.photos.addTaggedPersonasBatch(baulId, photoIds, personaIds);
  },
}));
