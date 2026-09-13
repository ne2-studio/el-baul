import { BaulAppearance, PhotoAsset } from '../../types';
import { path, type JsonRequest, type JsonResponse, type PathTemplate } from '../contract';
import { API_BASE, apiFetch, authHeaders, del, get, handleResponse, post } from '../http';
import type { MyPhotosFilter } from '@/store/useMyPhotosStore';

const MY_PHOTOS = '/api/users/me/photos' satisfies PathTemplate;
const MY_PHOTO = '/api/users/me/photos/{assetId}' satisfies PathTemplate;
const MY_PHOTOS_REMOVE_BATCH = '/api/users/me/photos/remove-batch' satisfies PathTemplate;
const MY_PHOTOS_ADD_TO_BAUL_BATCH = '/api/users/me/photos/add-to-baul-batch' satisfies PathTemplate;
const PHOTO_ASSET_ADD_TO_BAUL = '/api/photo-assets/{assetId}/add-to-baul' satisfies PathTemplate;

type PhotoAssetPageDto = JsonResponse<typeof MY_PHOTOS, 'get'>;

// User-scoped, not baúl-scoped — "Mis fotos" (docs/.backlog issue #62). The server derives the
// caller from the auth token; there is no userId/baulId to pass here at all.
export const myPhotosApi = {
  getPage: async (options: { skip?: number; take?: number; filter?: MyPhotosFilter } = {}) => {
    const params = new URLSearchParams();
    params.set('skip', String(options.skip ?? 0));
    params.set('take', String(options.take ?? 60));
    if (options.filter) params.set('filter', options.filter);
    const result = await get<PhotoAssetPageDto>(path(MY_PHOTOS, {}, params));
    return { assets: result.items.map((a) => new PhotoAsset(a)), hasMore: result.hasMore };
  },
  // Subida directa a Mis fotos (Slice 3, docs/.backlog issue #62) — mismo pipeline de ingesta
  // que photosApi.upload, sin capítulo/baúl de destino: crea/reutiliza el PhotoAsset canónico y
  // la relación UserPhotoAsset del usuario actual, sin crear ningún Photo.
  upload: async (file: File, clientUploadId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clientUploadId', clientUploadId);

    const response = await apiFetch(`${API_BASE}${MY_PHOTOS}`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });

    return new PhotoAsset(await handleResponse<JsonResponse<typeof MY_PHOTOS, 'post'>>(response));
  },
  // "Añadir a otro baúl" desde Mis fotos (docs/.backlog issue #62, Slice 2 — wiring de Mis
  // fotos): mismo efecto que photosApi.addToBaul, pero autorizado sobre el PhotoAsset (haberlo
  // subido originalmente) en vez de sobre una foto de origen, ya que aquí no hay un baúl actual
  // del que partir. Devuelve solo la nueva aparición, para fusionarla en el asset ya cargado.
  addToBaul: async (assetId: string, targetBaulId: string) =>
    new BaulAppearance(await post<JsonResponse<typeof PHOTO_ASSET_ADD_TO_BAUL, 'post'>>(
      path(PHOTO_ASSET_ADD_TO_BAUL, { assetId }), { targetBaulId } satisfies JsonRequest<typeof PHOTO_ASSET_ADD_TO_BAUL, 'post'>)),
  // "Quitar de Mis fotos" (Slice 5, docs/.backlog issue #62) — soft-deletes solo la relación
  // UserPhotoAsset del usuario actual con este asset. Nunca borra el PhotoAsset ni ninguna Photo.
  remove: (assetId: string) =>
    del<JsonResponse<typeof MY_PHOTO, 'delete'>>(path(MY_PHOTO, { assetId })),
  // Contraparte en lote de remove, para la selección múltiple de Mis fotos — una sola petición
  // al backend (docs/.backlog issue #62 §9), no N peticiones sueltas.
  removeBatch: (assetIds: string[]) =>
    del<JsonResponse<typeof MY_PHOTOS_REMOVE_BATCH, 'delete'>>(
      MY_PHOTOS_REMOVE_BATCH, { assetIds } satisfies JsonRequest<typeof MY_PHOTOS_REMOVE_BATCH, 'delete'>),
  // "Añadir a un baúl" en lote desde la selección múltiple de Mis fotos (Slice 5) — reutiliza
  // AddAssetToBaulAsync una vez por asset en el propio backend; un asset ya presente en el baúl
  // destino cuenta como éxito, no como error (ver PhotoManager.AddAssetsToBaulBatchAsync).
  addToBaulBatch: async (assetIds: string[], targetBaulId: string) =>
    (await post<JsonResponse<typeof MY_PHOTOS_ADD_TO_BAUL_BATCH, 'post'>>(
      MY_PHOTOS_ADD_TO_BAUL_BATCH,
      { assetIds, targetBaulId } satisfies JsonRequest<typeof MY_PHOTOS_ADD_TO_BAUL_BATCH, 'post'>))
      .map((a) => new BaulAppearance(a)),
};
