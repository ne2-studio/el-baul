import { Recuerdo } from '../../types';
import { path, type JsonRequest, type JsonResponse, type PathTemplate } from '../contract';
import { get, post, put } from '../http';
import type { SharedLinkResponse } from '../publicTypes';

const PHOTO_RECUERDOS = '/api/photos/{photoId}/recuerdos' satisfies PathTemplate;
const CHAPTER_RECUERDOS = '/api/baules/{baulId}/chapters/{chapterId}/recuerdos' satisfies PathTemplate;
const BAUL_RECUERDOS = '/api/baules/{baulId}/recuerdos' satisfies PathTemplate;
const RECUERDO = '/api/recuerdos/{recuerdoId}' satisfies PathTemplate;
const RECUERDO_SHARE = '/api/recuerdos/{recuerdoId}/share' satisfies PathTemplate;

type RecuerdoDto = JsonResponse<typeof RECUERDO, 'put'>;

export const recuerdosApi = {
  getAll: async (photoId: string) =>
    (await get<JsonResponse<typeof PHOTO_RECUERDOS, 'get'>>(path(PHOTO_RECUERDOS, { photoId }))).map((r) => new Recuerdo(r)),
  create: async (photoId: string, text: string) =>
    new Recuerdo(await post<JsonResponse<typeof PHOTO_RECUERDOS, 'post'>>(path(PHOTO_RECUERDOS, { photoId }), { text } satisfies JsonRequest<typeof PHOTO_RECUERDOS, 'post'>)),
  getAllByChapter: async (baulId: string, chapterId: string) =>
    (await get<JsonResponse<typeof CHAPTER_RECUERDOS, 'get'>>(path(CHAPTER_RECUERDOS, { baulId, chapterId }))).map((r) => new Recuerdo(r)),
  createForChapter: async (baulId: string, chapterId: string, text: string) =>
    new Recuerdo(await post<JsonResponse<typeof CHAPTER_RECUERDOS, 'post'>>(path(CHAPTER_RECUERDOS, { baulId, chapterId }), { text } satisfies JsonRequest<typeof CHAPTER_RECUERDOS, 'post'>)),
  getAllByBaul: async (baulId: string) =>
    (await get<JsonResponse<typeof BAUL_RECUERDOS, 'get'>>(path(BAUL_RECUERDOS, { baulId }))).map((r) => new Recuerdo(r)),
  createStandalone: async (baulId: string, text: string) =>
    new Recuerdo(await post<JsonResponse<typeof BAUL_RECUERDOS, 'post'>>(path(BAUL_RECUERDOS, { baulId }), { text } satisfies JsonRequest<typeof BAUL_RECUERDOS, 'post'>)),
  update: async (recuerdoId: string, text: string) =>
    new Recuerdo(await put<RecuerdoDto>(path(RECUERDO, { recuerdoId }), { text } satisfies JsonRequest<typeof RECUERDO, 'put'>)),
  createShareLink: (recuerdoId: string) => post<SharedLinkResponse>(path(RECUERDO_SHARE, { recuerdoId })),
};
