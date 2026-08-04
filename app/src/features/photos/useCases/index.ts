import { api } from '@/api';
import { usePersonasStore } from '@/store/usePersonasStore';

export async function submitRemovalRequest(baulId: string, photo: { id: string }, reason: string): Promise<void> {
  await api.baules.submitRemovalRequest(baulId, photo.id, reason);
}

export async function loadTaggedPersonas(photoId: string): Promise<void> {
  const taggedPersonas = await api.photos.getTaggedPersonas(photoId);
  usePersonasStore.setState((state) => ({ taggedPersonas: { ...state.taggedPersonas, [photoId]: taggedPersonas } }));
}

export async function setTaggedPersonas(photoId: string, personaIds: string[]): Promise<void> {
  const taggedPersonas = await api.photos.setTaggedPersonas(photoId, personaIds);
  usePersonasStore.setState((state) => ({ taggedPersonas: { ...state.taggedPersonas, [photoId]: taggedPersonas } }));
}
