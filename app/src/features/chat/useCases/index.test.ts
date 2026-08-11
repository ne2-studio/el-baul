import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api';
import { useChatStore } from '@/store/useChatStore';
import { ChatMessage } from '@/types';
import { loadChatConversation, sendChatMessage } from './index';

vi.mock('@/api', () => ({
  api: {
    chat: {
      getMessages: vi.fn(),
      sendMessage: vi.fn(),
      getSuggestedQuestions: vi.fn(),
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
