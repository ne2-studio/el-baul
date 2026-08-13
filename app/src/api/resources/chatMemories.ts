import { ChatMemory } from '../../types';
import { path, type JsonRequest, type JsonResponse, type PathTemplate } from '../contract';
import { del, get, put } from '../http';

const BAUL_CHAT_MEMORIES = '/api/baules/{baulId}/chat/memories' satisfies PathTemplate;
const CHAT_MEMORY = '/api/chat-memories/{chatMemoryId}' satisfies PathTemplate;

export const chatMemoriesApi = {
  getAll: async (baulId: string) =>
    (await get<JsonResponse<typeof BAUL_CHAT_MEMORIES, 'get'>>(path(BAUL_CHAT_MEMORIES, { baulId }))).map((m) => new ChatMemory(m)),
  update: async (chatMemoryId: string, content: string) =>
    new ChatMemory(await put<JsonResponse<typeof CHAT_MEMORY, 'put'>>(path(CHAT_MEMORY, { chatMemoryId }), { content } satisfies JsonRequest<typeof CHAT_MEMORY, 'put'>)),
  delete: (chatMemoryId: string) => del<JsonResponse<typeof CHAT_MEMORY, 'delete'>>(path(CHAT_MEMORY, { chatMemoryId })),
};
