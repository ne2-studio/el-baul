import { api } from '@/api';
import { usePersonasStore } from '@/store/usePersonasStore';
import { usePhotosStore } from '@/store/usePhotosStore';

export async function submitRemovalRequest(baulId: string, photo: { id: string }, reason: string): Promise<void> {
  await api.baules.submitRemovalRequest(baulId, photo.id, reason);
}

export async function loadRemovalRequests(baulId: string): Promise<void> {
  const removalRequests = await api.baules.getRemovalRequests(baulId);
  usePersonasStore.setState((state) => ({ removalRequests: { ...state.removalRequests, [baulId]: removalRequests } }));
}

export async function removePhoto(baulId: string, requestId: string, photoId: string): Promise<void> {
  await api.baules.approveRemovalRequest(baulId, requestId);
  usePhotosStore.getState().removePhoto(photoId);
  usePersonasStore.setState((state) => ({
    removalRequests: {
      ...state.removalRequests,
      [baulId]: (state.removalRequests[baulId] || []).filter((r) => r.id !== requestId),
    },
  }));
}

export async function keepPhoto(baulId: string, requestId: string): Promise<void> {
  await api.baules.rejectRemovalRequest(baulId, requestId);
  usePersonasStore.setState((state) => ({
    removalRequests: {
      ...state.removalRequests,
      [baulId]: (state.removalRequests[baulId] || []).filter((r) => r.id !== requestId),
    },
  }));
}
