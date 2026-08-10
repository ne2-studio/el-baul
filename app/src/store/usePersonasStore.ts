import { create } from 'zustand';
import { Persona, RemovalRequest, TaggedPersona } from '@/types';

export interface PersonasState {
  personas: Record<string, Persona[]>;
  removalRequests: Record<string, RemovalRequest[]>;
  taggedPersonas: Record<string, TaggedPersona[]>; // keyed by photoId
  // Photo ids, not Photo objects — usePhotosStore.photosById is the canonical source for a
  // photo's own fields. Hydrate with hydratePhotos (see that store) wherever a component needs
  // the actual Photo[]. Keyed by personaId; a photo can be tagged with several personas at once.
  personaPhotos: Record<string, string[]>;

  reset: () => void;
}

// Actions live in features/{people,sharing,photos,chapters,baules}/useCases — this store only
// holds state and reset. A photo's own fields are never patched here: deletePhoto/
// changePhotoDate/removePhoto write once to usePhotosStore instead, and personaPhotos just
// stops resolving (delete) or picks up the new fields (update) the next time it's hydrated. See
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
}));
