import { create } from 'zustand';
import { Persona, RemovalRequest, Photo, TaggedPersona } from '@/types';

export interface PersonasState {
  personas: Record<string, Persona[]>;
  removalRequests: Record<string, RemovalRequest[]>;
  taggedPersonas: Record<string, TaggedPersona[]>; // keyed by photoId
  personaPhotos: Record<string, Photo[]>; // keyed by personaId

  reset: () => void;
}

// Actions live in features/{people,sharing,photos,chapters,baules}/useCases — this store
// only holds state and its reset. See docs/architecture/frontend.md for the ownership rule
// that splits a single shared store's actions across the features that call them.
export const usePersonasStore = create<PersonasState>((set) => ({
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
}));
