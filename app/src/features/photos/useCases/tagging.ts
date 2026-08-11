import { api } from '@/api';
import { usePersonasStore } from '@/store/usePersonasStore';

export async function loadTaggedPersonas(photoId: string): Promise<void> {
  const taggedPersonas = await api.photos.getTaggedPersonas(photoId);
  usePersonasStore.setState((state) => ({ taggedPersonas: { ...state.taggedPersonas, [photoId]: taggedPersonas } }));
}

export async function setTaggedPersonas(photoId: string, personaIds: string[]): Promise<void> {
  const taggedPersonas = await api.photos.setTaggedPersonas(photoId, personaIds);
  usePersonasStore.setState((state) => ({ taggedPersonas: { ...state.taggedPersonas, [photoId]: taggedPersonas } }));
}

// Sin store que actualizar: a diferencia de setTaggedPersonas, esta acción no produce ningún
// dato que otra pantalla necesite leer — solo evita que ContributionSuggestionContainer vuelva
// a proponer esta foto.
export async function confirmPhotoHasNoPersonas(photoId: string): Promise<void> {
  await api.photos.confirmNoPersonas(photoId);
}
