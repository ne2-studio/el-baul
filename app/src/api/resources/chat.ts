import { ChatMessage } from '../../types';
import { path, type JsonRequest, type JsonResponse, type PathTemplate } from '../contract';
import { get, post } from '../http';

const BAUL_CHAT = '/api/baules/{baulId}/chat' satisfies PathTemplate;
const CHAT_SUGGESTIONS = '/api/baules/{baulId}/chat/suggestions' satisfies PathTemplate;

export const chatApi = {
  getMessages: async (baulId: string) =>
    (await get<JsonResponse<typeof BAUL_CHAT, 'get'>>(path(BAUL_CHAT, { baulId }))).map((m) => new ChatMessage(m)),
  sendMessage: async (baulId: string, text: string) =>
    new ChatMessage(await post<JsonResponse<typeof BAUL_CHAT, 'post'>>(path(BAUL_CHAT, { baulId }), { text } satisfies JsonRequest<typeof BAUL_CHAT, 'post'>)),
  getSuggestedQuestions: (baulId: string) => get<JsonResponse<typeof CHAT_SUGGESTIONS, 'get'>>(path(CHAT_SUGGESTIONS, { baulId })),
};
