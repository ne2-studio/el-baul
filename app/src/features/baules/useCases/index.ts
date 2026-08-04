import { api } from '@/api';
import { usePersonasStore } from '@/store/usePersonasStore';

export async function createPersona(baulId: string, nickname: string): Promise<void> {
  const persona = await api.baules.createPersona(baulId, nickname);
  usePersonasStore.setState((state) => ({
    personas: { ...state.personas, [baulId]: [...(state.personas[baulId] || []), persona] },
  }));
}
