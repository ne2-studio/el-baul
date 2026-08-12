import { Photo } from '../../types';
import { path, type JsonResponse, type PathTemplate } from '../contract';
import { get } from '../http';

const PHOTO_BATCH_PHOTOS = '/api/baules/{baulId}/photo-batches/{batchId}/photos' satisfies PathTemplate;

export const photoBatchesApi = {
  getPhotos: async (baulId: string, batchId: string) =>
    (await get<JsonResponse<typeof PHOTO_BATCH_PHOTOS, 'get'>>(path(PHOTO_BATCH_PHOTOS, { baulId, batchId }))).map((p) => new Photo(p)),
};
