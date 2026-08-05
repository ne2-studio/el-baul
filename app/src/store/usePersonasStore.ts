import { create } from 'zustand';
import { Persona, RemovalRequest, Photo, TaggedPersona } from '@/types';
import { removePhotoFromPersonaPhotos, updatePhotoInPersonaPhotos } from './personasCacheReconciliation';

export interface PersonasState {
  personas: Record<string, Persona[]>;
  removalRequests: Record<string, RemovalRequest[]>;
  taggedPersonas: Record<string, TaggedPersona[]>; // keyed by photoId
  personaPhotos: Record<string, Photo[]>; // keyed by personaId

  reset: () => void;

  // Cross-store support for features/{sharing,photos}/useCases (removePhoto, deletePhoto,
  // changePhotoDate): a photo can be tagged with several personas at once and any photo
  // viewer can trigger these without knowing which persona(s) had it cached, so this patches
  // it wherever it's found.
  removePhotoFromCaches: (photoId: string) => void;
  updatePhotoInCaches: (photo: Photo) => void;
}

// Actions live in features/{people,sharing,photos,chapters,baules}/useCases — this store
// only holds state, reset, and removePhotoFromCaches/updatePhotoInCaches (cross-store
// setters with no api call of their own, not a use case of any one feature). See
// docs/architecture/frontend.md for the ownership rule that splits a single shared store's
// actions across the features that call them.
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

  removePhotoFromCaches: (photoId) => set((state) => ({
    personaPhotos: removePhotoFromPersonaPhotos(state.personaPhotos, photoId),
  })),
  updatePhotoInCaches: (photo) => set((state) => ({
    personaPhotos: updatePhotoInPersonaPhotos(state.personaPhotos, photo),
  })),
}));
