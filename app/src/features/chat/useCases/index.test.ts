import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api';
import { useChatStore } from '@/store/useChatStore';
import { useChatMemoriesStore } from '@/store/useChatMemoriesStore';
import { ChatMemory, ChatMessage } from '@/types';
import {
  deleteChatMemory,
  loadChatConversation,
  loadChatMemories,
  sendChatMessage,
  updateChatMemory,
} from './index';

vi.mock('@/api', () => ({
  api: {
    chat: {
      getMessages: vi.fn(),
      sendMessage: vi.fn(),
      getSuggestedQuestions: vi.fn(),
    },
    chatMemories: {
      getAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const baulId = 'baul-1';

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return new ChatMessage({
    id: 'm1',
    role: 'user',
    content: 'Hola',
    createdAt: new Date().toISOString(),
    ...overrides,
  });
}

const memoryTimestamp = new Date().toISOString();

function memory(overrides: Partial<ChatMemory> = {}): ChatMemory {
  return new ChatMemory({
    id: 'mem-1',
    content: 'El abuelo Manuel trabajó en Muebles López.',
    createdAt: memoryTimestamp,
    updatedAt: memoryTimestamp,
    ...overrides,
  });
}

describe('chat useCases', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
    vi.clearAllMocks();
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'optimistic-1') });
    vi.mocked(api.chat.getMessages).mockResolvedValue([]);
    vi.mocked(api.chat.getSuggestedQuestions).mockResolvedValue([]);
  });

  it('loads starter suggestions when history is empty and suggestions are enabled', async () => {
    vi.mocked(api.chat.getSuggestedQuestions).mockResolvedValue(['¿Quién es esta persona?']);

    await loadChatConversation(baulId, { suggestionsEnabled: true });

    expect(useChatStore.getState().messages).toEqual([]);
    expect(useChatStore.getState().suggestions).toEqual(['¿Quién es esta persona?']);
    expect(useChatStore.getState().isLoadingHistory).toBe(false);
    expect(useChatStore.getState().isLoadingSuggestions).toBe(false);
    expect(api.chat.getSuggestedQuestions).toHaveBeenCalledWith(baulId);
  });

  it('skips suggestions when history is present', async () => {
    vi.mocked(api.chat.getMessages).mockResolvedValue([message({ id: 'history-1' })]);

    await loadChatConversation(baulId, { suggestionsEnabled: true });

    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().suggestions).toEqual([]);
    expect(api.chat.getSuggestedQuestions).not.toHaveBeenCalled();
  });

  it('appends an optimistic outgoing message and then the assistant reply', async () => {
    useChatStore.setState({ activeBaulId: baulId });
    vi.mocked(api.chat.sendMessage).mockResolvedValue(
      message({ id: 'reply-1', role: 'assistant', content: 'En 1945.' })
    );

    await sendChatMessage(baulId, '¿Cuándo nació la abuela?');

    expect(useChatStore.getState().messages.map((m) => m.content)).toEqual([
      '¿Cuándo nació la abuela?',
      'En 1945.',
    ]);
    expect(useChatStore.getState().messages[0]).toMatchObject({
      id: 'optimistic-1',
      role: 'user',
    });
    expect(useChatStore.getState().isSending).toBe(false);
    expect(useChatStore.getState().hasError).toBe(false);
    expect(api.chat.sendMessage).toHaveBeenCalledWith(baulId, '¿Cuándo nació la abuela?');
  });

  it('keeps the optimistic outgoing message and marks the send as failed', async () => {
    useChatStore.setState({ activeBaulId: baulId });
    vi.mocked(api.chat.sendMessage).mockRejectedValue(new Error('network'));

    await sendChatMessage(baulId, '¿Cuándo nació la abuela?');

    expect(useChatStore.getState().messages.map((m) => m.content)).toEqual(['¿Cuándo nació la abuela?']);
    expect(useChatStore.getState().hasError).toBe(true);
    expect(useChatStore.getState().isSending).toBe(false);
  });
});

describe('chat memories useCases', () => {
  beforeEach(() => {
    useChatMemoriesStore.getState().reset();
    vi.clearAllMocks();
  });

  it('loads memories for the baúl', async () => {
    vi.mocked(api.chatMemories.getAll).mockResolvedValue([memory()]);

    await loadChatMemories(baulId);

    expect(useChatMemoriesStore.getState().baulId).toBe(baulId);
    expect(useChatMemoriesStore.getState().memories).toEqual([memory()]);
    expect(useChatMemoriesStore.getState().isLoading).toBe(false);
    expect(useChatMemoriesStore.getState().hasError).toBe(false);
  });

  it('marks an error when loading memories fails', async () => {
    vi.mocked(api.chatMemories.getAll).mockRejectedValue(new Error('network'));

    await loadChatMemories(baulId);

    expect(useChatMemoriesStore.getState().hasError).toBe(true);
    expect(useChatMemoriesStore.getState().isLoading).toBe(false);
  });

  it('updates a memory in place and regenerates its embedding server-side', async () => {
    useChatMemoriesStore.setState({ baulId, memories: [memory()] });
    const updated = memory({ content: 'El abuelo Manuel trabajó 30 años en Muebles López.' });
    vi.mocked(api.chatMemories.update).mockResolvedValue(updated);

    const ok = await updateChatMemory(baulId, 'mem-1', 'El abuelo Manuel trabajó 30 años en Muebles López.');

    expect(ok).toBe(true);
    expect(useChatMemoriesStore.getState().memories).toEqual([updated]);
    expect(api.chatMemories.update).toHaveBeenCalledWith('mem-1', 'El abuelo Manuel trabajó 30 años en Muebles López.');
  });

  it('returns false and leaves the memory untouched when updating fails', async () => {
    useChatMemoriesStore.setState({ baulId, memories: [memory()] });
    vi.mocked(api.chatMemories.update).mockRejectedValue(new Error('network'));

    const ok = await updateChatMemory(baulId, 'mem-1', 'texto nuevo');

    expect(ok).toBe(false);
    expect(useChatMemoriesStore.getState().memories).toEqual([memory()]);
  });

  it('removes a deleted memory from the list', async () => {
    useChatMemoriesStore.setState({ baulId, memories: [memory()] });
    vi.mocked(api.chatMemories.delete).mockResolvedValue({ success: true });

    const ok = await deleteChatMemory(baulId, 'mem-1');

    expect(ok).toBe(true);
    expect(useChatMemoriesStore.getState().memories).toEqual([]);
  });

  it('returns false and keeps the memory when deleting fails', async () => {
    useChatMemoriesStore.setState({ baulId, memories: [memory()] });
    vi.mocked(api.chatMemories.delete).mockRejectedValue(new Error('network'));

    const ok = await deleteChatMemory(baulId, 'mem-1');

    expect(ok).toBe(false);
    expect(useChatMemoriesStore.getState().memories).toEqual([memory()]);
  });
});
