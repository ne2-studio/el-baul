import { Baul, BaulInviteLink, FeedItem, Persona, Photo, RemovalRequest, feedItemFrom } from '../../types';
import { path, type JsonRequest, type JsonResponse, type PathTemplate } from '../contract';
import { API_BASE, authHeaders, get, handleResponse, post, put, del } from '../http';
import type { AvatarCrop } from '../publicTypes';

const BAULES = '/api/baules' satisfies PathTemplate;
const BAUL = '/api/baules/{baulId}' satisfies PathTemplate;
const BAUL_COVER = '/api/baules/{baulId}/cover' satisfies PathTemplate;
const BAUL_PERSONAS = '/api/baules/{baulId}/personas' satisfies PathTemplate;
const BAUL_PERSONA = '/api/baules/{baulId}/personas/{personaId}' satisfies PathTemplate;
const PERSONA_BIOGRAFIA = '/api/baules/{baulId}/personas/{personaId}/biografia' satisfies PathTemplate;
const PERSONA_AVATAR = '/api/baules/{baulId}/personas/{personaId}/avatar' satisfies PathTemplate;
const PERSONA_ROLE = '/api/baules/{baulId}/personas/{personaId}/role' satisfies PathTemplate;
const PERSONA_PHOTOS = '/api/baules/{baulId}/personas/{personaId}/photos' satisfies PathTemplate;
const LOOSE_PHOTOS = '/api/baules/{baulId}/photos/sueltas' satisfies PathTemplate;
const BAUL_FEED = '/api/baules/{baulId}/feed' satisfies PathTemplate;
const INVITE_LINK = '/api/baules/{baulId}/invite-link' satisfies PathTemplate;
const REGENERATE_INVITE_LINK = '/api/baules/{baulId}/invite-link/regenerate' satisfies PathTemplate;
const REMOVAL_REQUESTS = '/api/baules/{baulId}/removal-requests' satisfies PathTemplate;
const APPROVE_REMOVAL_REQUEST = '/api/baules/{baulId}/removal-requests/{requestId}/approve' satisfies PathTemplate;

type BaulDto = JsonResponse<typeof BAUL, 'get'>;
type PersonaDto = JsonResponse<typeof BAUL_PERSONA, 'get'>;
type PhotoDto = JsonResponse<typeof LOOSE_PHOTOS, 'get'>[number];
type FeedPageDto = JsonResponse<typeof BAUL_FEED, 'get'>;
type InviteLinkDto = JsonResponse<typeof INVITE_LINK, 'get'>;
type RemovalRequestDto = JsonResponse<typeof REMOVAL_REQUESTS, 'get'>[number];
type SuccessResponse = JsonResponse<typeof APPROVE_REMOVAL_REQUEST, 'post'>;

const baulPath = (baulId: string) => path(BAUL, { baulId });
const personaPath = (baulId: string, personaId: string) => path(BAUL_PERSONA, { baulId, personaId });

export const baulesApi = {
  getAll: async () => (await get<JsonResponse<typeof BAULES, 'get'>>(BAULES)).map((b) => new Baul(b)),
  create: async (name: string, description?: string) =>
    new Baul(await post<BaulDto>(BAULES, { name, description } satisfies JsonRequest<typeof BAULES, 'post'>)),
  getById: async (id: string) => new Baul(await get<BaulDto>(baulPath(id))),
  setCover: async (baulId: string, photoId: string) =>
    new Baul(await put<BaulDto>(path(BAUL_COVER, { baulId }), { photoId } satisfies JsonRequest<typeof BAUL_COVER, 'put'>)),
  update: async (baulId: string, name: string, description?: string) =>
    new Baul(await put<BaulDto>(baulPath(baulId), { name, description } satisfies JsonRequest<typeof BAUL, 'put'>)),

  getPersonas: async (baulId: string) =>
    (await get<JsonResponse<typeof BAUL_PERSONAS, 'get'>>(path(BAUL_PERSONAS, { baulId }))).map((u) => new Persona(u)),
  createPersona: async (baulId: string, nickname: string) =>
    new Persona(await post<PersonaDto>(path(BAUL_PERSONAS, { baulId }), { nickname } satisfies JsonRequest<typeof BAUL_PERSONAS, 'post'>)),
  getPersona: async (baulId: string, personaId: string) => new Persona(await get<PersonaDto>(personaPath(baulId, personaId))),
  updatePersona: async (baulId: string, personaId: string, name: string, nickname: string) =>
    new Persona(await put<PersonaDto>(personaPath(baulId, personaId), { name, nickname } satisfies JsonRequest<typeof BAUL_PERSONA, 'put'>)),
  updatePersonaBiografia: async (baulId: string, personaId: string, biografia: string) =>
    new Persona(await put<PersonaDto>(path(PERSONA_BIOGRAFIA, { baulId, personaId }), { biografia } satisfies JsonRequest<typeof PERSONA_BIOGRAFIA, 'put'>)),
  uploadPersonaAvatar: async (baulId: string, personaId: string, file: File, crop: AvatarCrop) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('cropX', String(crop.x));
    formData.append('cropY', String(crop.y));
    formData.append('cropScale', String(crop.scale));
    formData.append('clientUploadId', crypto.randomUUID());

    const response = await fetch(`${API_BASE}${path(PERSONA_AVATAR, { baulId, personaId })}`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });

    return new Persona(await handleResponse<PersonaDto>(response));
  },
  setPersonaAvatarPhoto: async (baulId: string, personaId: string, photoId: string, crop: AvatarCrop) =>
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

  getInviteLink: async (baulId: string) => new BaulInviteLink(await get<InviteLinkDto>(path(INVITE_LINK, { baulId }))),
  regenerateInviteLink: async (baulId: string) =>
    new BaulInviteLink(await post<JsonResponse<typeof REGENERATE_INVITE_LINK, 'post'>>(path(REGENERATE_INVITE_LINK, { baulId }))),

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
