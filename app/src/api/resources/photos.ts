import { Photo, PhotoDate } from '../../types';
import { path, type JsonRequest, type JsonResponse, type PathTemplate } from '../contract';
import { toTaggedPersona } from '../mappers';
import { API_BASE, apiFetch, authHeaders, del, get, handleResponse, post, put } from '../http';
import type { SharedLinkResponse } from '../publicTypes';

const CHAPTER_PHOTOS = '/api/chapters/{chapterId}/photos' satisfies PathTemplate;
const BAUL_PHOTOS = '/api/baules/{baulId}/photos' satisfies PathTemplate;
const LOOSE_PHOTOS = '/api/baules/{baulId}/photos/sueltas' satisfies PathTemplate;
const PHOTO_CHAPTER = '/api/photos/{photoId}/chapter' satisfies PathTemplate;
const PHOTO = '/api/photos/{photoId}' satisfies PathTemplate;
const PHOTO_DATE = '/api/photos/{photoId}/date' satisfies PathTemplate;
const PHOTO_DATE_BATCH = '/api/photos/date-batch' satisfies PathTemplate;
const PHOTO_DELETE_BATCH = '/api/photos/delete-batch' satisfies PathTemplate;
const PHOTO_DOWNLOAD = '/api/photos/{photoId}/download' satisfies PathTemplate;
const PHOTO_SHARE = '/api/photos/{photoId}/share' satisfies PathTemplate;
const PHOTO_PERSONAS = '/api/photos/{photoId}/personas' satisfies PathTemplate;
const PHOTO_TAG_BATCH = '/api/photos/tag-batch' satisfies PathTemplate;
const UNTAGGED_SUGGESTION = '/api/baules/{baulId}/photos/untagged-suggestion' satisfies PathTemplate;
const MEMORY_SUGGESTION = '/api/baules/{baulId}/photos/memory-suggestion' satisfies PathTemplate;
const PHOTO_NO_PERSONAS = '/api/photos/{photoId}/no-personas' satisfies PathTemplate;

type PhotoDto = JsonResponse<typeof PHOTO_CHAPTER, 'put'>;
type PhotoPageDto = JsonResponse<typeof BAUL_PHOTOS, 'get'>;
type SuccessResponse = JsonResponse<typeof PHOTO, 'delete'>;

const photoPath = (photoId: string) => path(PHOTO, { photoId });

export const photosApi = {
  getAll: async (chapterId: string) => (await get<JsonResponse<typeof CHAPTER_PHOTOS, 'get'>>(path(CHAPTER_PHOTOS, { chapterId }))).map((p) => new Photo(p)),
  getPage: async (baulId: string, options: { chapterId?: string; skip?: number; take?: number } = {}) => {
    const params = new URLSearchParams();
    if (options.chapterId) params.set('chapterId', options.chapterId);
    params.set('skip', String(options.skip ?? 0));
    params.set('take', String(options.take ?? 60));
    const result = await get<PhotoPageDto>(path(BAUL_PHOTOS, { baulId }, params));
    return { photos: result.items.map((p) => new Photo(p)), hasMore: result.hasMore };
  },
  upload: async (
    baulId: string, chapterId: string | null, file: File, clientUploadId: string,
    uploadBatchId?: string
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clientUploadId', clientUploadId);
    if (uploadBatchId) formData.append('uploadBatchId', uploadBatchId);

    const uploadPath = chapterId ? path(CHAPTER_PHOTOS, { chapterId }) : path(LOOSE_PHOTOS, { baulId });
    const response = await apiFetch(`${API_BASE}${uploadPath}`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });

    return new Photo(await handleResponse<JsonResponse<typeof LOOSE_PHOTOS, 'post'>>(response));
  },
  move: async (photoId: string, chapterId: string) =>
    new Photo(await put<PhotoDto>(path(PHOTO_CHAPTER, { photoId }), { chapterId } satisfies JsonRequest<typeof PHOTO_CHAPTER, 'put'>)),
  delete: (photoId: string, reason?: string) =>
    del<SuccessResponse>(photoPath(photoId), { reason } satisfies JsonRequest<typeof PHOTO, 'delete'>),
  deleteBatch: (photoIds: string[], reason?: string) =>
    del<JsonResponse<typeof PHOTO_DELETE_BATCH, 'delete'>>(
      PHOTO_DELETE_BATCH, { photoIds, reason } satisfies JsonRequest<typeof PHOTO_DELETE_BATCH, 'delete'>),
  changeDate: async (photoId: string, date: PhotoDate) =>
    new Photo(await put<JsonResponse<typeof PHOTO_DATE, 'put'>>(path(PHOTO_DATE, { photoId }), date satisfies JsonRequest<typeof PHOTO_DATE, 'put'>)),
  changeDateBatch: async (photoIds: string[], date: PhotoDate) =>
    (await put<JsonResponse<typeof PHOTO_DATE_BATCH, 'put'>>(PHOTO_DATE_BATCH, { photoIds, ...date } satisfies JsonRequest<typeof PHOTO_DATE_BATCH, 'put'>)).map((p) => new Photo(p)),
  clearDate: async (photoId: string) => new Photo(await del<JsonResponse<typeof PHOTO_DATE, 'delete'>>(path(PHOTO_DATE, { photoId }))),
  clearDateBatch: async (photoIds: string[]) =>
    (await del<JsonResponse<typeof PHOTO_DATE_BATCH, 'delete'>>(PHOTO_DATE_BATCH, { photoIds } satisfies JsonRequest<typeof PHOTO_DATE_BATCH, 'delete'>)).map((p) => new Photo(p)),
  download: async (photoId: string): Promise<{ blob: Blob; fileName: string }> => {
    const response = await apiFetch(`${API_BASE}${path(PHOTO_DOWNLOAD, { photoId })}`, { headers: authHeaders() });
    if (!response.ok) await handleResponse<never>(response);

    const disposition = response.headers.get('Content-Disposition') || '';
    const fileNameMatch = disposition.match(/filename="?([^";]+)"?/);
    const fileName = fileNameMatch ? decodeURIComponent(fileNameMatch[1]) : 'foto.jpg';

    return { blob: await response.blob(), fileName };
  },
  createShareLink: (photoId: string) => post<SharedLinkResponse>(path(PHOTO_SHARE, { photoId })),
  getTaggedPersonas: async (photoId: string) =>
    (await get<JsonResponse<typeof PHOTO_PERSONAS, 'get'>>(path(PHOTO_PERSONAS, { photoId }))).map(toTaggedPersona),
  setTaggedPersonas: (photoId: string, personaIds: string[]) =>
    put<JsonResponse<typeof PHOTO_PERSONAS, 'put'>>(path(PHOTO_PERSONAS, { photoId }), { personaIds } satisfies JsonRequest<typeof PHOTO_PERSONAS, 'put'>).then((personas) =>
      personas.map(toTaggedPersona)
    ),
  addTaggedPersonasBatch: (baulId: string, photoIds: string[], personaIds: string[]) =>
    put<JsonResponse<typeof PHOTO_TAG_BATCH, 'put'>>(PHOTO_TAG_BATCH, { baulId, photoIds, personaIds } satisfies JsonRequest<typeof PHOTO_TAG_BATCH, 'put'>),
  getUntaggedSuggestion: async (baulId: string) => {
    const dto = await get<JsonResponse<typeof UNTAGGED_SUGGESTION, 'get'>>(path(UNTAGGED_SUGGESTION, { baulId }));
    return dto ? new Photo(dto) : null;
  },
  getMemorySuggestion: async (baulId: string) => {
    const dto = await get<JsonResponse<typeof MEMORY_SUGGESTION, 'get'>>(path(MEMORY_SUGGESTION, { baulId }));
    return dto ? new Photo(dto) : null;
  },
  confirmNoPersonas: async (photoId: string) => new Photo(await put<JsonResponse<typeof PHOTO_NO_PERSONAS, 'put'>>(path(PHOTO_NO_PERSONAS, { photoId }))),
};
