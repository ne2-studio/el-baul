import { create } from 'zustand';
import { ChatMemory } from '@/types';

interface ChatMemoriesState {
  baulId: string | null;
  memories: ChatMemory[];
  isLoading: boolean;
  hasError: boolean;

  reset: () => void;
}

const initialState = {
  baulId: null,
  memories: [],
  isLoading: false,
  hasError: false,
};

export const useChatMemoriesStore = create<ChatMemoriesState>((set) => ({
  ...initialState,

  reset: () => set(initialState),
}));
