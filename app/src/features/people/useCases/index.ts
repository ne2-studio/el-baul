import { api } from '@/api';
import { usePersonasStore } from '@/store/usePersonasStore';

export async function loadPersonas(baulId: string): Promise<void> {
  const personas = await api.baules.getPersonas(baulId);
  usePersonasStore.setState((state) => ({ personas: { ...state.personas, [baulId]: personas } }));
}

export async function loadPersonaPhotos(baulId: string, personaId: string): Promise<void> {
  const photos = await api.baules.getPersonaPhotos(baulId, personaId);
  usePersonasStore.setState((state) => ({ personaPhotos: { ...state.personaPhotos, [personaId]: photos } }));
}
