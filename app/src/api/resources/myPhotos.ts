import { PhotoAsset } from '../../types';
import { path, type JsonResponse, type PathTemplate } from '../contract';
import { get } from '../http';

const MY_PHOTOS = '/api/users/me/photos' satisfies PathTemplate;

type PhotoAssetPageDto = JsonResponse<typeof MY_PHOTOS, 'get'>;

// User-scoped, not baúl-scoped — "Mis fotos" (docs/.backlog issue #62). The server derives the
// caller from the auth token; there is no userId/baulId to pass here at all.
export const myPhotosApi = {
  getPage: async (options: { skip?: number; take?: number } = {}) => {
    const params = new URLSearchParams();
    params.set('skip', String(options.skip ?? 0));
    params.set('take', String(options.take ?? 60));
    const result = await get<PhotoAssetPageDto>(path(MY_PHOTOS, {}, params));
    return { assets: result.items.map((a) => new PhotoAsset(a)), hasMore: result.hasMore };
  },
};
