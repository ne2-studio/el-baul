import { Baul, Chapter, FeedItem, Persona, PersonaInvite, Photo, Recuerdo, RemovalRequest, feedItemFrom } from '../../types';
import { path, type JsonRequest, type JsonResponse, type PathTemplate } from '../contract';
import { API_BASE, apiFetch, authHeaders, get, handleResponse, post, put, del } from '../http';
import type { PhotoCrop } from '../publicTypes';

const BAULES = '/api/baules' satisfies PathTemplate;
const BAUL = '/api/baules/{baulId}' satisfies PathTemplate;
const BAUL_COVER = '/api/baules/{baulId}/cover' satisfies PathTemplate;
const BAUL_SCOPE = '/api/baules/{baulId}/scope' satisfies PathTemplate;
const BAUL_PERSONAS = '/api/baules/{baulId}/personas' satisfies PathTemplate;
const BAUL_PERSONA = '/api/baules/{baulId}/personas/{personaId}' satisfies PathTemplate;
const PERSONA_SCOPE = '/api/baules/{baulId}/personas/{personaId}/scope' satisfies PathTemplate;
const PERSONA_BIOGRAFIA = '/api/baules/{baulId}/personas/{personaId}/biografia' satisfies PathTemplate;
const PERSONA_AVATAR = '/api/baules/{baulId}/personas/{personaId}/avatar' satisfies PathTemplate;
const PERSONA_ROLE = '/api/baules/{baulId}/personas/{personaId}/role' satisfies PathTemplate;
const PERSONA_PHOTOS = '/api/baules/{baulId}/personas/{personaId}/photos' satisfies PathTemplate;
const LOOSE_PHOTOS = '/api/baules/{baulId}/photos/sueltas' satisfies PathTemplate;
const BAUL_FEED = '/api/baules/{baulId}/feed' satisfies PathTemplate;
const PERSONA_INVITE = '/api/baules/{baulId}/personas/{personaId}/invite' satisfies PathTemplate;
const REMOVAL_REQUESTS = '/api/baules/{baulId}/removal-requests' satisfies PathTemplate;
const APPROVE_REMOVAL_REQUEST = '/api/baules/{baulId}/removal-requests/{requestId}/approve' satisfies PathTemplate;

type BaulDto = JsonResponse<typeof BAUL, 'get'>;
type BaulScopeDto = JsonResponse<typeof BAUL_SCOPE, 'get'>;
type PersonaScopeDto = JsonResponse<typeof PERSONA_SCOPE, 'get'>;
type PersonaDto = JsonResponse<typeof BAUL_PERSONA, 'get'>;
type PhotoDto = JsonResponse<typeof LOOSE_PHOTOS, 'get'>[number];
type FeedPageDto = JsonResponse<typeof BAUL_FEED, 'get'>;
type RemovalRequestDto = JsonResponse<typeof REMOVAL_REQUESTS, 'get'>[number];
type SuccessResponse = JsonResponse<typeof APPROVE_REMOVAL_REQUEST, 'post'>;

const feedPageFrom = (dto: FeedPageDto) => ({ feedItems: dto.items.map(feedItemFrom), hasMore: dto.hasMore });

const baulPath = (baulId: string) => path(BAUL, { baulId });
const personaPath = (baulId: string, personaId: string) => path(BAUL_PERSONA, { baulId, personaId });

export const baulesApi = {
  getAll: async () => (await get<JsonResponse<typeof BAULES, 'get'>>(BAULES)).map((b) => new Baul(b)),
  create: async (name: string, description?: string) =>
    new Baul(await post<BaulDto>(BAULES, { name, description } satisfies JsonRequest<typeof BAULES, 'post'>)),
  getById: async (id: string) => new Baul(await get<BaulDto>(baulPath(id))),
  // Backs useBaulScope — one request instead of the 5-6 loadX calls it used to fan out, see
  // BaulScopeAggregator (api/) for why includeBaulFeed is resolved server-side in one go instead
  // of racing against a separate app-config fetch.
  getScope: async (baulId: string, includeBaulFeed: boolean) => {
    const params = new URLSearchParams({ includeBaulFeed: String(includeBaulFeed) });
    const dto = await get<BaulScopeDto>(path(BAUL_SCOPE, { baulId }, params));
    return {
      baul: new Baul(dto.baul),
      chapters: dto.chapters.map((c) => new Chapter(c)),
      loosePhotos: dto.loosePhotos.map((p) => new Photo(p)),
      recuerdos: dto.recuerdos.map((r) => new Recuerdo(r)),
      personas: dto.personas.map((u) => new Persona(u)),
      removalRequests: dto.removalRequests ? dto.removalRequests.map((r) => new RemovalRequest(r)) : null,
      baulFeed: dto.baulFeed ? feedPageFrom(dto.baulFeed) : null,
    };
  },
  setCover: async (baulId: string, photoId: string, crop: PhotoCrop) =>
    new Baul(await put<BaulDto>(path(BAUL_COVER, { baulId }), {
      photoId, cropX: crop.x, cropY: crop.y, cropScale: crop.scale,
    } satisfies JsonRequest<typeof BAUL_COVER, 'put'>)),
  update: async (baulId: string, name: string, description?: string) =>
    new Baul(await put<BaulDto>(baulPath(baulId), { name, description } satisfies JsonRequest<typeof BAUL, 'put'>)),

  getPersonas: async (baulId: string) =>
    (await get<JsonResponse<typeof BAUL_PERSONAS, 'get'>>(path(BAUL_PERSONAS, { baulId }))).map((u) => new Persona(u)),
  createPersona: async (baulId: string, nickname: string, role?: string) =>
    new Persona(await post<PersonaDto>(path(BAUL_PERSONAS, { baulId }), { nickname, role } satisfies JsonRequest<typeof BAUL_PERSONAS, 'post'>)),
  getPersona: async (baulId: string, personaId: string) => new Persona(await get<PersonaDto>(personaPath(baulId, personaId))),
  updatePersona: async (baulId: string, personaId: string, name: string, nickname: string) =>
    new Persona(await put<PersonaDto>(personaPath(baulId, personaId), { name, nickname } satisfies JsonRequest<typeof BAUL_PERSONA, 'put'>)),
  updatePersonaBiografia: async (baulId: string, personaId: string, biografia: string) =>
    new Persona(await put<PersonaDto>(path(PERSONA_BIOGRAFIA, { baulId, personaId }), { biografia } satisfies JsonRequest<typeof PERSONA_BIOGRAFIA, 'put'>)),
  uploadPersonaAvatar: async (baulId: string, personaId: string, file: File, crop: PhotoCrop) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('cropX', String(crop.x));
    formData.append('cropY', String(crop.y));
    formData.append('cropScale', String(crop.scale));
    formData.append('clientUploadId', crypto.randomUUID());

    const response = await apiFetch(`${API_BASE}${path(PERSONA_AVATAR, { baulId, personaId })}`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });

    return new Persona(await handleResponse<PersonaDto>(response));
  },
  setPersonaAvatarPhoto: async (baulId: string, personaId: string, photoId: string, crop: PhotoCrop) =>
    new Persona(await put<PersonaDto>(path(PERSONA_AVATAR, { baulId, personaId }), {
      photoId,
      cropX: crop.x,
      cropY: crop.y,
      cropScale: crop.scale,
    } satisfies JsonRequest<typeof PERSONA_AVATAR, 'put'>)),
  updatePersonaRole: (baulId: string, personaId: string, role: string) =>
    put<void>(path(PERSONA_ROLE, { baulId, personaId }), { role } satisfies JsonRequest<typeof PERSONA_ROLE, 'put'>),
  revokeAccess: (baulId: string, personaId: string) => del<SuccessResponse>(personaPath(baulId, personaId)),

  getLoosePhotos: async (baulId: string) =>
    (await get<PhotoDto[]>(path(LOOSE_PHOTOS, { baulId }))).map((p) => new Photo(p)),
  getFeed: async (baulId: string, options: { skip?: number; take?: number } = {}): Promise<{ feedItems: FeedItem[]; hasMore: boolean }> => {
    const params = new URLSearchParams();
    params.set('skip', String(options.skip ?? 0));
    params.set('take', String(options.take ?? 20));
    const result = await get<FeedPageDto>(path(BAUL_FEED, { baulId }, params));
    return { feedItems: result.items.map(feedItemFrom), hasMore: result.hasMore };
  },
  getPersonaPhotos: async (baulId: string, personaId: string) =>
    (await get<JsonResponse<typeof PERSONA_PHOTOS, 'get'>>(path(PERSONA_PHOTOS, { baulId, personaId }))).map((p) => new Photo(p)),
  // Backs usePersonaScope — see baulesApi.getScope's doc comment (same rationale).
  getPersonaScope: async (baulId: string, personaId: string) => {
    const dto = await get<PersonaScopeDto>(path(PERSONA_SCOPE, { baulId, personaId }));
    return {
      personas: dto.personas.map((u) => new Persona(u)),
      personaPhotos: dto.personaPhotos.map((p) => new Photo(p)),
      baulRecuerdos: dto.baulRecuerdos.map((r) => new Recuerdo(r)),
    };
  },

  invitePersona: async (baulId: string, personaId: string) =>
    new PersonaInvite(await post<JsonResponse<typeof PERSONA_INVITE, 'post'>>(path(PERSONA_INVITE, { baulId, personaId }))),

  getRemovalRequests: async (baulId: string) =>
    (await get<RemovalRequestDto[]>(path(REMOVAL_REQUESTS, { baulId }))).map((r) => new RemovalRequest(r)),
  submitRemovalRequest: async (baulId: string, photoId: string, reason?: string) =>
    new RemovalRequest(await post<JsonResponse<typeof REMOVAL_REQUESTS, 'post'>>(
      path(REMOVAL_REQUESTS, { baulId }),
      { photoId, reason } satisfies JsonRequest<typeof REMOVAL_REQUESTS, 'post'>
    )),
  approveRemovalRequest: (baulId: string, requestId: string) =>
    post<SuccessResponse>(path(APPROVE_REMOVAL_REQUEST, { baulId, requestId })),
  rejectRemovalRequest: (baulId: string, requestId: string) =>
    post<SuccessResponse>(path('/api/baules/{baulId}/removal-requests/{requestId}/reject', { baulId, requestId })),
};
