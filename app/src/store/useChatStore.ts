import { create } from 'zustand';
import { ChatMessage } from '@/types';

interface ChatState {
  activeBaulId: string | null;
  messages: ChatMessage[];
  isLoadingHistory: boolean;
  isSending: boolean;
  hasError: boolean;
  suggestions: string[];
  isLoadingSuggestions: boolean;

  reset: () => void;
}

const initialState = {
  activeBaulId: null,
  messages: [],
  isLoadingHistory: false,
  isSending: false,
  hasError: false,
  suggestions: [],
  isLoadingSuggestions: false,
};

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  reset: () => set(initialState),
}));
