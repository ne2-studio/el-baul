import { api } from '@/api';
import { useChatStore } from '@/store/useChatStore';
import { useChatMemoriesStore } from '@/store/useChatMemoriesStore';
import { ChatMessage } from '@/types';

interface LoadChatConversationOptions {
  suggestionsEnabled: boolean;
}

function isActiveBaul(baulId: string): boolean {
  return useChatStore.getState().activeBaulId === baulId;
}

async function loadSuggestions(baulId: string): Promise<void> {
  useChatStore.setState({ isLoadingSuggestions: true });

  try {
    const suggestions = await api.chat.getSuggestedQuestions(baulId);
    if (isActiveBaul(baulId)) {
      useChatStore.setState({ suggestions });
    }
  } catch {
    if (isActiveBaul(baulId)) {
      useChatStore.setState({ suggestions: [] });
    }
  } finally {
    if (isActiveBaul(baulId)) {
      useChatStore.setState({ isLoadingSuggestions: false });
    }
  }
}

export async function loadChatConversation(
  baulId: string,
  { suggestionsEnabled }: LoadChatConversationOptions
): Promise<void> {
  useChatStore.setState({
    activeBaulId: baulId,
    messages: [],
    isLoadingHistory: true,
    isSending: false,
    hasError: false,
    suggestions: [],
    isLoadingSuggestions: false,
  });

  try {
    const history = await api.chat.getMessages(baulId);
    if (!isActiveBaul(baulId)) return;

    useChatStore.setState({ messages: history, isLoadingHistory: false });

    if (history.length === 0 && suggestionsEnabled) {
      await loadSuggestions(baulId);
    }
  } catch {
    if (isActiveBaul(baulId)) {
      useChatStore.setState({ hasError: true, isLoadingHistory: false });
    }
  }
}

export async function sendChatMessage(baulId: string, text: string): Promise<void> {
  const outgoingMessage = new ChatMessage({
    id: crypto.randomUUID(),
    role: 'user',
    content: text,
    createdAt: new Date().toISOString(),
  });

  useChatStore.setState((state) => ({
    messages: [...state.messages, outgoingMessage],
    isSending: true,
    hasError: false,
  }));

  try {
    const reply = await api.chat.sendMessage(baulId, text);
    if (isActiveBaul(baulId)) {
      useChatStore.setState((state) => ({ messages: [...state.messages, reply] }));
    }
  } catch {
    if (isActiveBaul(baulId)) {
      useChatStore.setState({ hasError: true });
    }
  } finally {
    if (isActiveBaul(baulId)) {
      useChatStore.setState({ isSending: false });
    }
  }
}

function isActiveMemoriesBaul(baulId: string): boolean {
  return useChatMemoriesStore.getState().baulId === baulId;
}

export async function loadChatMemories(baulId: string): Promise<void> {
  useChatMemoriesStore.setState({ baulId, memories: [], isLoading: true, hasError: false });

  try {
    const memories = await api.chatMemories.getAll(baulId);
    if (isActiveMemoriesBaul(baulId)) {
      useChatMemoriesStore.setState({ memories, isLoading: false });
    }
  } catch {
    if (isActiveMemoriesBaul(baulId)) {
      useChatMemoriesStore.setState({ hasError: true, isLoading: false });
    }
  }
}

export async function updateChatMemory(baulId: string, chatMemoryId: string, content: string): Promise<boolean> {
  try {
    const updated = await api.chatMemories.update(chatMemoryId, content);
    if (isActiveMemoriesBaul(baulId)) {
      useChatMemoriesStore.setState((state) => ({
        memories: state.memories.map((memory) => (memory.id === chatMemoryId ? updated : memory)),
      }));
    }
    return true;
  } catch {
    return false;
  }
}

export async function deleteChatMemory(baulId: string, chatMemoryId: string): Promise<boolean> {
  try {
    await api.chatMemories.delete(chatMemoryId);
    if (isActiveMemoriesBaul(baulId)) {
      useChatMemoriesStore.setState((state) => ({
        memories: state.memories.filter((memory) => memory.id !== chatMemoryId),
      }));
    }
    return true;
  } catch {
    return false;
  }
}
