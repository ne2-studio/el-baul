import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RemovalRequest } from '@/types';

vi.mock('@/api', () => ({
  api: {
    baules: {
      getLoosePhotos: vi.fn(),
      getRemovalRequests: vi.fn(),
      submitRemovalRequest: vi.fn(),
      approveRemovalRequest: vi.fn(),
      rejectRemovalRequest: vi.fn(),
    },
    chapters: {
      getAll: vi.fn(),
    },
    photos: {
      upload: vi.fn(),
      getAll: vi.fn(),
      move: vi.fn(),
      delete: vi.fn(),
      changeDate: vi.fn(),
      clearDate: vi.fn(),
      getTaggedPersonas: vi.fn(),
      setTaggedPersonas: vi.fn(),
      confirmNoPersonas: vi.fn(),
    },
    photoBatches: {
      getPhotos: vi.fn(),
    },
  },
}));

import { api } from '@/api';
import { usePersonasStore } from '@/store/usePersonasStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { loadRemovalRequests, removePhoto } from './index';
import { newPhoto } from '@/features/photos/useCases/testFactories';

describe('photos useCases loadRemovalRequests', () => {
  const baulId = 'baul-1';

  beforeEach(() => {
    usePersonasStore.setState({ personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {} });
    vi.clearAllMocks();
  });

  it('rejects and leaves the store untouched when the API call fails', async () => {
    const error = new Error('network down');
    vi.mocked(api.baules.getRemovalRequests).mockRejectedValue(error);

    await expect(loadRemovalRequests(baulId)).rejects.toThrow(error);

    expect(usePersonasStore.getState().removalRequests[baulId]).toBeUndefined();
  });

  it('still stores the result on success', async () => {
    const request = new RemovalRequest({
      id: 'r1',
      baulId,
      photoId: 'photo-1',
      photoUrl: 'url',
      requesterName: 'Pedro',
      requesterEmail: 'pedro@example.com',
      reason: 'blurry',
      requestDate: new Date().toISOString(),
      status: 'pending',
    });
    vi.mocked(api.baules.getRemovalRequests).mockResolvedValue([request]);

    await loadRemovalRequests(baulId);

    expect(usePersonasStore.getState().removalRequests[baulId]).toEqual([request]);
  });
});

describe('photos useCases removePhoto', () => {
  const baulId = 'baul-1';
  const photoId = 'photo-1';

  beforeEach(() => {
    usePersonasStore.setState({ removalRequests: {}, personaPhotos: {} });
    usePhotosStore.setState({ photosById: {} });
    vi.clearAllMocks();
  });

  it('approves the removal request, removes the photo from usePhotosStore, and drops the request', async () => {
    const requestId = 'request-1';
    usePhotosStore.getState().upsertPhotos([newPhoto(photoId)]);
    usePersonasStore.setState({
      removalRequests: { [baulId]: [{ id: requestId } as never, { id: 'other-request' } as never] },
    });

    await removePhoto(baulId, requestId, photoId);

    expect(api.baules.approveRemovalRequest).toHaveBeenCalledWith(baulId, requestId);
    expect(usePhotosStore.getState().photosById[photoId]).toBeUndefined();
    expect(usePersonasStore.getState().removalRequests[baulId]).toEqual([{ id: 'other-request' }]);
  });
});
