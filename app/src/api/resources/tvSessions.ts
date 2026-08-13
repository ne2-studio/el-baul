import { TvSession, TvSessionContent } from '../../types';
import { path, type JsonResponse, type PathTemplate } from '../contract';
import { del, get, post } from '../http';

const BAUL_TV_SESSIONS = '/api/baules/{baulId}/tv-sessions' satisfies PathTemplate;
const TV_SESSION = '/api/tv-sessions/{token}' satisfies PathTemplate;

export const tvSessionsApi = {
  create: async (baulId: string) =>
    new TvSession(await post<JsonResponse<typeof BAUL_TV_SESSIONS, 'post'>>(path(BAUL_TV_SESSIONS, { baulId }))),
  cancel: (token: string) => del<void>(path(TV_SESSION, { token })),
  // Anonymous — the TV client never carries an access token, the token in the URL is the
  // credential (see docs/API-CONVENTIONS.md).
  getContent: async (token: string) =>
    new TvSessionContent(await get<JsonResponse<typeof TV_SESSION, 'get'>>(path(TV_SESSION, { token }))),
};
