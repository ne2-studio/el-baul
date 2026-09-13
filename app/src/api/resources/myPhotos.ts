import { BaulAppearance, PhotoAsset } from '../../types';
import { path, type JsonRequest, type JsonResponse, type PathTemplate } from '../contract';
import { get, post } from '../http';

const MY_PHOTOS = '/api/users/me/photos' satisfies PathTemplate;
const PHOTO_ASSET_ADD_TO_BAUL = '/api/photo-assets/{assetId}/add-to-baul' satisfies PathTemplate;

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
  // "Añadir a otro baúl" desde Mis fotos (docs/.backlog issue #62, Slice 2 — wiring de Mis
  // fotos): mismo efecto que photosApi.addToBaul, pero autorizado sobre el PhotoAsset (haberlo
  // subido originalmente) en vez de sobre una foto de origen, ya que aquí no hay un baúl actual
  // del que partir. Devuelve solo la nueva aparición, para fusionarla en el asset ya cargado.
  addToBaul: async (assetId: string, targetBaulId: string) =>
    new BaulAppearance(await post<JsonResponse<typeof PHOTO_ASSET_ADD_TO_BAUL, 'post'>>(
      path(PHOTO_ASSET_ADD_TO_BAUL, { assetId }), { targetBaulId } satisfies JsonRequest<typeof PHOTO_ASSET_ADD_TO_BAUL, 'post'>)),
};
