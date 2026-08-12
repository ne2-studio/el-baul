import { BaulInviteLinkPreview, ClaimablePersona, Persona } from '../../types';
import { path, type JsonRequest, type JsonResponse, type PathTemplate } from '../contract';
import { get, post } from '../http';

const INVITE_PREVIEW = '/api/baul-invites/{token}/preview' satisfies PathTemplate;
const CLAIMABLE_PERSONAS = '/api/baul-invites/{token}/claimable-personas' satisfies PathTemplate;
const ACCEPT_INVITE = '/api/baul-invites/{token}/accept' satisfies PathTemplate;

export const baulInvitesApi = {
  getPreview: async (token: string) =>
    new BaulInviteLinkPreview(await get<JsonResponse<typeof INVITE_PREVIEW, 'get'>>(path(INVITE_PREVIEW, { token }))),
  getClaimablePersonas: async (token: string) =>
    (await get<JsonResponse<typeof CLAIMABLE_PERSONAS, 'get'>>(path(CLAIMABLE_PERSONAS, { token })))
      .map((dto) => new ClaimablePersona(dto)),
  accept: async (token: string, personaId?: string) =>
    new Persona(await post<JsonResponse<typeof ACCEPT_INVITE, 'post'>>(
      path(ACCEPT_INVITE, { token }),
      { personaId: personaId ?? null } satisfies JsonRequest<typeof ACCEPT_INVITE, 'post'>
    )),
};
