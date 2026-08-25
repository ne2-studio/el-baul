import { PersonaInvitePreview, Persona } from '../../types';
import { path, type JsonResponse, type PathTemplate } from '../contract';
import { get, post } from '../http';

const INVITE_PREVIEW = '/api/persona-invites/{token}/preview' satisfies PathTemplate;
const ACCEPT_INVITE = '/api/persona-invites/{token}/accept' satisfies PathTemplate;

export const personaInvitesApi = {
  getPreview: async (token: string) =>
    new PersonaInvitePreview(await get<JsonResponse<typeof INVITE_PREVIEW, 'get'>>(path(INVITE_PREVIEW, { token }))),
  accept: async (token: string) =>
    new Persona(await post<JsonResponse<typeof ACCEPT_INVITE, 'post'>>(path(ACCEPT_INVITE, { token }))),
};
